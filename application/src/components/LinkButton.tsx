import Link from "next/link";
import { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LinkButtonProps {
    href: string;
    children: ReactNode;
    variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined
    className?: string;
}

function LinkButton({ href, children, variant = "default", className }: LinkButtonProps) {
    const buttonClasses = cn(
        buttonVariants({ variant }),
        className
    );

    return (
        <Link href={href} className={buttonClasses}>
            {children}
        </Link>
    );
}

export default LinkButton;
