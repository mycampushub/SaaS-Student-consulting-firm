import { ReactNode } from "react"

interface StudentPortalLayoutProps {
  children: ReactNode
  params: {
    subdomain: string
  }
}

export default function StudentPortalLayout({ children }: StudentPortalLayoutProps) {
  return children
}