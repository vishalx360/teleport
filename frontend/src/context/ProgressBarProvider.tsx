"use client";
import { AppProgressBar } from "next-nprogress-bar";

function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppProgressBar height="2px" color="black" options={{ showSpinner: false }} shallowRouting />
    </>
  );
}

export default ProgressBarProvider;
