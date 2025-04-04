import { validateRequest } from "~/server/auth/lucia";
import TasksComponent from './_components/TasksComponent';
import Link from 'next/link';

export default async function HomePage() {
  console.log("Home Page: Rendering");
  
  try {
    const { user } = await validateRequest();
    console.log("Home Page: Auth check complete", { isAuthenticated: !!user });
    
    // Instead of redirecting, show a login message if not authenticated
    if (!user) {
      return (
        <main className="container mx-auto px-4 py-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Authentication Required</p>
            <p>Please <Link href="/login" className="underline">login</Link> to view your tasks.</p>
          </div>
        </main>
      );
    }
    
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Tasks</h1>
        <TasksComponent />
      </main>
    );
  } catch (error) {
    console.error("Home Page: Error", error);
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>There was a problem loading this page. Please try again later.</p>
        </div>
      </main>
    );
  }
}