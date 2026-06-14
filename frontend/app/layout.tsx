import './globals.css'

export const metadata = {
  title: 'SecureMeet',
  description: 'Private. Encrypted. Invite-only.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
