"use client";

import Link from "next/link";
import SignupForm from "../_components/SignupForm";

export default function SignupPage() {
  return (
    <div className="container mx-auto py-10">
      <SignupForm />
      
      <div className="text-center mt-4">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
} 