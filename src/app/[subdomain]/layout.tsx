import { ReactNode } from "react"

interface SubdomainLayoutProps {
  children: ReactNode
  params: {
    subdomain: string
  }
}

export default function SubdomainLayout({ children }: SubdomainLayoutProps) {
  return children
}