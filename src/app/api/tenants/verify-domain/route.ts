import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import dns from 'dns/promises'

const verifySchema = z.object({
  agencyId: z.string(),
  customDomain: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifySchema.parse(body)

    // Get agency details
    const agency = await db.agency.findUnique({
      where: { id: validatedData.agencyId }
    })

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      )
    }

    const domain = validatedData.customDomain

    try {
      // Check DNS records
      const dnsResults = await Promise.allSettled([
        // Check A record
        dns.resolve4(domain),
        // Check CNAME record
        dns.resolveCname(domain),
        // Check TXT record for verification
        dns.resolveTxt(domain)
      ])

      const aRecord = dnsResults[0].status === 'fulfilled' ? dnsResults[0].value : []
      const cnameRecord = dnsResults[1].status === 'fulfilled' ? dnsResults[1].value : []
      const txtRecord = dnsResults[2].status === 'fulfilled' ? dnsResults[2].value : []

      // Check if domain points to our server (simplified check)
      const isValidARecord = aRecord.length > 0 // In production, check against actual server IP
      const isValidCname = cnameRecord.some(cname => 
        cname.includes('eduagency.com') || cname.includes('your-platform.com')
      )

      // Check for verification TXT record
      const verificationRecord = txtRecord.flat().find(record => 
        record.includes('eduagency-verification=') || record.includes(`agency-${agency.id}`)
      )

      const isVerified = isValidARecord || isValidCname || !!verificationRecord

      // Update agency status
      if (isVerified) {
        await db.agency.update({
          where: { id: validatedData.agencyId },
          data: {
            customDomain: domain,
            status: 'ACTIVE'
          }
        })
      }

      return NextResponse.json({
        success: true,
        verified: isVerified,
        dnsRecords: {
          a: aRecord,
          cname: cnameRecord,
          txt: txtRecord.flat()
        },
        verification: {
          isValidARecord,
          isValidCname,
          hasVerificationRecord: !!verificationRecord,
          verificationRecord
        },
        message: isVerified 
          ? 'Domain verified successfully!' 
          : 'Domain verification failed. Please check your DNS settings.'
      })

    } catch (dnsError) {
      console.error('DNS verification error:', dnsError)
      
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'DNS lookup failed',
        message: 'Unable to verify domain. Please ensure the domain is properly configured and try again.'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Domain verification error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}