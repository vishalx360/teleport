import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";



const BackButton = () => {
    const router = useRouter();

    const goBack = () => {
        router.back();
    };
    return (
        <Button onClick={goBack} variant="ghost" className="w-10 h-10 p-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
        </Button>
    );
};

export default BackButton;