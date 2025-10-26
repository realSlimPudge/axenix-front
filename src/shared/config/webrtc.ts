const baseIceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

function getTurnServers(): RTCIceServer[] {
    const turnUrls =
        process.env.NEXT_PUBLIC_TURN_URLS?.split(",").map((url) =>
            url.trim()
        ) ?? [];

    const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const credential = process.env.NEXT_PUBLIC_TURN_PASSWORD;

    return turnUrls
        .filter(Boolean)
        .map<RTCIceServer>((url) => {
            if (username && credential) {
                return {
                    urls: url,
                    username,
                    credential,
                } satisfies RTCIceServer;
            }

            return { urls: url } satisfies RTCIceServer;
        });
}

export const RTC_CONFIG: RTCConfiguration = {
    iceServers: [...baseIceServers, ...getTurnServers()],
    iceCandidatePoolSize: 10,
};
