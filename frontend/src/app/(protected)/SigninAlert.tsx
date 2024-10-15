"use client";

import { LucideLock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function SigninAlert(
  { redirectUrl = "/login", timeout = 5, message = "Please login to visit this page" }
    : { redirectUrl?: String; timeout?: Number; message?: String }) {
  const router = useRouter();
  //   redirect to signin page in 5 seconds using timeout and useeffect
  const [counter, setCounter] = useState(Number(timeout));
  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((counter) => {
        return --counter;
      });
    }, 1000);
    const timer = setTimeout(async () => {
      router.push(String(redirectUrl));
    }, Number(timeout) * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="container flex h-screen items-center justify-center">
      <div className="rounded-xl p-10 shadow-lg">
        <h1 className="mb-5 text-xl">
          <LucideLock className="inline" /> {message}
        </h1>
        <p>
          you will be redirected in {counter} seconds.
        </p>
      </div>
    </div>
  );
}

export default SigninAlert;
