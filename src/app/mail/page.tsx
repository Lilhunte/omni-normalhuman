import { Mail } from '@/app/mail/components/mail'
import { ModeToggle } from '@/components/theme-toggle';
import { cookies } from 'next/headers'
import ComposeButton from './components/compose-button';
import { UserButton } from '@clerk/nextjs';

export default async function MailPage() {

  const cookieStore = await cookies();
  const layout = cookieStore.get("react-resizable-panels:layout:mail");
  const collapsed = cookieStore.get("react-resizable-panels:collapsed");

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  return (
    <>
      <div className="flex-col hidden md:flex h-screen overflow-scroll">
        <div className='absolute flex items-center bottom-4 left-4'>
          <UserButton />
          <ModeToggle />
          <ComposeButton />
        </div>
        <Mail
          defaultLayout={defaultLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={4}
        />
      </div>
    </>
  )
}
