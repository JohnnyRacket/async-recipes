import { redirect } from 'next/navigation';

// The homepage is served via proxy rewrite to /home/[variant].
// This fallback redirects to the control variant if accessed directly.
export default function Home() {
  redirect('/home/a');
}
