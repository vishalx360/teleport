import ioredis from "ioredis";


const globalForRedis = global as unknown as { redisClient: ioredis };

export const redisClient = globalForRedis.redisClient ?? new ioredis(process.env.REDIS_URL);

redisClient.on("error", (err) => {
    console.error("Redis error: ", err);
});
redisClient.on("connect", () => {
    console.log("Redis connected");
});

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redisClient = redisClient;
}
