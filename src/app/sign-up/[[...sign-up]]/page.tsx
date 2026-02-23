import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp 
        forceRedirectUrl="/sync-user"
        signInUrl="/sign-in"
      />
    </div>
  )
}