import { api } from "@/trpc/server";


function RebookPage({ params }: {
    params: {
        bookingId: string
    }
}) {
    const { bookingId } = params;
    api.user.rebook(bookingId);
    return <div>Rebooking {bookingId}</div>
}

export default RebookPage