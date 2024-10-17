"use client"

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';

function TestPusher() {
    const { isPending, mutate } = api.user.testPusher.useMutation({
        onSuccess(data, variables, context) {
            console.log(data)
        },
        onError(error, variables, context) {
            console.error(error.message);
        },

    });
    return (
        <div>
            <Button onClick={() => { mutate() }}>TestPusher</Button>
        </div>
    )
}

export default TestPusher