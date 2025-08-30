import { redirect } from 'next/navigation'

interface SubdomainPageProps {
  params: {
    subdomain: string
  }
}

export default function SubdomainPage({ params }: SubdomainPageProps) {
  // Redirect to dashboard for now
  redirect(`/${params.subdomain}/dashboard`)
}