"use client";

import { pusherClient } from '@/lib/pusherClient';
import { UserNotification } from '@/server/api/trpc';
import { useSession } from 'next-auth/react';
import { Channel } from 'pusher-js';
import { useEffect } from 'react';
import { toast } from 'sonner';

function PusherListener() {
    const { data: session } = useSession();

    useEffect(() => {
        let userChannel: Channel | null = null;

        if (session?.user.id) {

            pusherClient.user.bind(`notification`, async (data: UserNotification) => {
                toast[data.type](data.message);
            });

            userChannel = pusherClient.subscribe(`user-${session?.user.id}`);
            userChannel.bind(`notification`, async (data: UserNotification) => {
                toast[data.type](data.message);
            });
        }
        return () => {
            if (userChannel) {
                userChannel.unbind_all();
                pusherClient.unsubscribe(`user-${session?.user.id}`);
            }
        };
    }, [session?.user.id]);

    return null;
}

export default PusherListener