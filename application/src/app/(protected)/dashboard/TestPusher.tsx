"use client"

import { Button } from '@/components/ui/button';
import { pusherClient } from '@/lib/pusherClient';
import { api } from '@/trpc/react';
import PusherListener from '../PusherListener';

function TestPusher() {
    const { isPending, mutate } = api.user.testPusher.useMutation({
        onSuccess(booking, variables, context) {
            console.log(booking)
            console.log(pusherClient.user)
        },
        onError(error, variables, context) {
            console.error(error.message);
        },

    });
    return (
        <div>
            <PusherListener />
            <Button onClick={() => { mutate() }}>TestPusher</Button>
        </div>
    )
}

export default TestPusher