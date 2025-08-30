import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const conversationSchema = z.object({
  chatbotId: z.string(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  studentId: z.string().optional(),
  leadId: z.string().optional(),
  anonymousId: z.string().optional(),
  userInfo: z.any().optional(),
  source: z.string().optional(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional()
})

const messageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["USER", "ASSISTANT", "SYSTEM"]),
  content: z.string(),
  type: z.enum(["TEXT", "IMAGE", "FILE", "QUICK_REPLY", "CAROUSEL"]).optional(),
  attachments: z.array(z.any()).optional(),
  metadata: z.any().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const chatbotId = searchParams.get("chatbotId")
    const sessionId = searchParams.get("sessionId")
    const userId = searchParams.get("userId")
    const studentId = searchParams.get("studentId")
    const leadId = searchParams.get("leadId")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if AI chatbot is enabled
    if (!agency.featureSettings?.aiChatbotEnabled) {
      return NextResponse.json({ 
        error: "AI chatbot is not enabled for this agency" 
      }, { status: 403 })
    }

    const where: any = { agencyId: agency.id }
    
    if (chatbotId) where.chatbotId = chatbotId
    if (sessionId) where.sessionId = sessionId
    if (userId) where.userId = userId
    if (studentId) where.studentId = studentId
    if (leadId) where.leadId = leadId
    if (status) where.status = status

    const conversations = await db.chatConversation.findMany({
      where,
      include: {
        chatbot: true,
        user: true,
        student: true,
        lead: true,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50
        },
        feedback: true
      },
      orderBy: { lastActivityAt: "desc" },
      take: limit
    })

    // Parse JSON fields
    const processedConversations = conversations.map(conv => ({
      ...conv,
      userInfo: conv.userInfo ? JSON.parse(conv.userInfo) : null,
      messages: conv.messages.map(msg => ({
        ...msg,
        sourceArticles: msg.sourceArticles ? JSON.parse(msg.sourceArticles) : [],
        citations: msg.citations ? JSON.parse(msg.citations) : [],
        attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    }))

    return NextResponse.json({ conversations: processedConversations })
  } catch (error) {
    console.error("Error fetching chat conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { action, data } = body

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if AI chatbot is enabled
    if (!agency.featureSettings?.aiChatbotEnabled) {
      return NextResponse.json({ 
        error: "AI chatbot is not enabled for this agency" 
      }, { status: 403 })
    }

    switch (action) {
      case "START_CONVERSATION":
        return await startConversation(agency.id, data)
      case "SEND_MESSAGE":
        return await sendMessage(agency.id, data)
      case "END_CONVERSATION":
        return await endConversation(agency.id, data)
      case "GET_CHATBOT_CONFIG":
        return await getChatbotConfig(agency.id, data)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in chatbot action:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions
async function startConversation(agencyId: string, data: any) {
  const validatedData = conversationSchema.parse(data)

  // Verify chatbot exists and belongs to agency
  const chatbot = await db.chatbot.findFirst({
    where: {
      id: validatedData.chatbotId,
      agencyId,
      status: "ACTIVE"
    }
  })

  if (!chatbot) {
    return NextResponse.json({ error: "Chatbot not found or inactive" }, { status: 404 })
  }

  // Generate session ID if not provided
  const sessionId = validatedData.sessionId || generateSessionId()

  // Check if conversation already exists
  let conversation = await db.chatConversation.findFirst({
    where: {
      agencyId,
      sessionId
    }
  })

  if (!conversation) {
    conversation = await db.chatConversation.create({
      data: {
        agencyId,
        chatbotId: chatbot.id,
        sessionId,
        userId: validatedData.userId,
        studentId: validatedData.studentId,
        leadId: validatedData.leadId,
        anonymousId: validatedData.anonymousId,
        userInfo: validatedData.userInfo ? JSON.stringify(validatedData.userInfo) : null,
        source: validatedData.source || "web",
        referrer: validatedData.referrer,
        userAgent: validatedData.userAgent,
        ipAddress: validatedData.ipAddress
      },
      include: {
        chatbot: true,
        user: true,
        student: true,
        lead: true
      }
    })
  }

  // Send welcome message if this is a new conversation
  if (conversation.messageCount === 0 && chatbot.welcomeMessage) {
    await db.chatMessage.create({
      data: {
        agencyId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: chatbot.welcomeMessage,
        type: "TEXT",
        status: "DELIVERED"
      }
    })

    // Update conversation message count
    await db.chatConversation.update({
      where: { id: conversation.id },
      data: { messageCount: 1 }
    })
  }

  // Parse JSON fields for response
  const processedConversation = {
    ...conversation,
    userInfo: conversation.userInfo ? JSON.parse(conversation.userInfo) : null
  }

  return NextResponse.json(processedConversation)
}

async function sendMessage(agencyId: string, data: any) {
  const validatedData = messageSchema.parse(data)

  // Verify conversation exists and belongs to agency
  const conversation = await db.chatConversation.findFirst({
    where: {
      id: validatedData.conversationId,
      agencyId,
      status: "ACTIVE"
    },
    include: {
      chatbot: true
    }
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found or inactive" }, { status: 404 })
  }

  // Create user message
  const userMessage = await db.chatMessage.create({
    data: {
      agencyId,
      conversationId: conversation.id,
      role: "USER",
      content: validatedData.content,
      type: validatedData.type || "TEXT",
      attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
      metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      status: "DELIVERED"
    }
  })

  // Generate AI response
  const aiResponse = await generateAIResponse(agencyId, conversation, validatedData.content)

  // Create AI message
  const aiMessage = await db.chatMessage.create({
    data: {
      agencyId,
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: aiResponse.content,
      type: "TEXT",
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      responseTime: aiResponse.responseTime,
      sourceArticles: aiResponse.sourceArticles ? JSON.stringify(aiResponse.sourceArticles) : null,
      citations: aiResponse.citations ? JSON.stringify(aiResponse.citations) : null,
      status: "DELIVERED"
    }
  })

  // Update conversation
  await db.chatConversation.update({
    where: { id: conversation.id },
    data: {
      messageCount: conversation.messageCount + 2,
      lastActivityAt: new Date()
    }
  })

  return NextResponse.json({
    userMessage,
    aiMessage: {
      ...aiMessage,
      sourceArticles: aiMessage.sourceArticles ? JSON.parse(aiMessage.sourceArticles) : [],
      citations: aiMessage.citations ? JSON.parse(aiMessage.citations) : []
    }
  })
}

async function endConversation(agencyId: string, data: any) {
  const { conversationId, satisfaction } = data

  const conversation = await db.chatConversation.findFirst({
    where: {
      id: conversationId,
      agencyId
    }
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const updatedConversation = await db.chatConversation.update({
    where: { id: conversationId },
    data: {
      status: "ENDED",
      endedAt: new Date(),
      satisfaction
    }
  })

  return NextResponse.json({ success: true, conversation: updatedConversation })
}

async function getChatbotConfig(agencyId: string, data: any) {
  const { chatbotId } = data

  const chatbot = await db.chatbot.findFirst({
    where: {
      id: chatbotId,
      agencyId,
      status: "ACTIVE"
    }
  })

  if (!chatbot) {
    return NextResponse.json({ error: "Chatbot not found or inactive" }, { status: 404 })
  }

  return NextResponse.json({
    id: chatbot.id,
    name: chatbot.name,
    welcomeMessage: chatbot.welcomeMessage,
    primaryColor: chatbot.primaryColor,
    secondaryColor: chatbot.secondaryColor,
    position: chatbot.position,
    enableVoice: chatbot.enableVoice,
    enableFileUpload: chatbot.enableFileUpload,
    enableFeedback: chatbot.enableFeedback
  })
}

async function generateAIResponse(agencyId: string, conversation: any, userMessage: string) {
  const startTime = Date.now()

  try {
    // Get chatbot configuration
    const chatbot = conversation.chatbot

    // Get knowledge base if enabled
    let knowledgeBase = []
    if (chatbot.useKnowledgeBase) {
      knowledgeBase = await getKnowledgeBaseForChatbot(agencyId)
    }

    // Get training data if enabled
    let trainingData = []
    if (chatbot.useFAQ) {
      trainingData = await getTrainingDataForChatbot(agencyId, chatbot.id)
    }

    // Simple AI response simulation (in real implementation, use ZAI SDK)
    const response = await simulateAIResponse(userMessage, knowledgeBase, trainingData, chatbot)

    const responseTime = Date.now() - startTime

    return {
      content: response.content,
      intent: response.intent,
      confidence: response.confidence,
      responseTime,
      sourceArticles: response.sourceArticles || [],
      citations: response.citations || []
    }
  } catch (error) {
    console.error("Error generating AI response:", error)
    
    return {
      content: "I'm sorry, I'm having trouble responding right now. Please try again later or contact support.",
      intent: "error",
      confidence: 0,
      responseTime: Date.now() - startTime,
      sourceArticles: [],
      citations: []
    }
  }
}

async function getKnowledgeBaseForChatbot(agencyId: string) {
  const articles = await db.knowledgeArticle.findMany({
    where: {
      agencyId,
      isPublished: true,
      isDeprecated: false
    },
    take: 100
  })

  return articles.map(article => ({
    id: article.id,
    title: article.title,
    content: article.content,
    type: article.type,
    category: article.category
  }))
}

async function getTrainingDataForChatbot(agencyId: string, chatbotId: string) {
  const training = await db.chatbotTraining.findMany({
    where: {
      agencyId,
      chatbotId,
      isActive: true,
      reviewStatus: "APPROVED"
    },
    take: 100
  })

  return training.map(item => ({
    question: item.question,
    answer: item.answer,
    category: item.category
  }))
}

async function simulateAIResponse(userMessage: string, knowledgeBase: any[], trainingData: any[], chatbot: any) {
  // Simple keyword matching simulation
  const lowerMessage = userMessage.toLowerCase()

  // Check training data first
  for (const item of trainingData) {
    if (lowerMessage.includes(item.question.toLowerCase())) {
      return {
        content: item.answer,
        intent: "faq_match",
        confidence: 0.9,
        sourceArticles: [],
        citations: []
      }
    }
  }

  // Check knowledge base
  for (const article of knowledgeBase) {
    if (lowerMessage.includes(article.title.toLowerCase()) || 
        lowerMessage.includes(article.content.toLowerCase().substring(0, 100))) {
      return {
        content: article.content.substring(0, 500) + "...",
        intent: "knowledge_base",
        confidence: 0.8,
        sourceArticles: [article.id],
        citations: [article.title]
      }
    }
  }

  // Default responses based on keywords
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return {
      content: "Hello! I'm here to help you with your educational journey. How can I assist you today?",
      intent: "greeting",
      confidence: 0.95,
      sourceArticles: [],
      citations: []
    }
  }

  if (lowerMessage.includes("visa")) {
    return {
      content: "I can help you with visa information. Could you please specify which country you're interested in and what type of visa information you need?",
      intent: "visa_inquiry",
      confidence: 0.85,
      sourceArticles: [],
      citations: []
    }
  }

  if (lowerMessage.includes("university") || lowerMessage.includes("college")) {
    return {
      content: "I'd be happy to help you find universities! Could you tell me what country you're interested in studying in and what subject you'd like to pursue?",
      intent: "university_inquiry",
      confidence: 0.85,
      sourceArticles: [],
      citations: []
    }
  }

  // Default fallback response
  return {
    content: "I'm here to help with your educational journey. I can assist with university information, visa requirements, application processes, and more. Could you please be more specific about what you'd like to know?",
    intent: "general_inquiry",
    confidence: 0.7,
    sourceArticles: [],
    citations: []
  }
}

function generateSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}