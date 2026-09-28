import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
		unoptimized: true,
	},
	turbopack: {},
};

const withSerwist = withSerwistInit({
	swSrc: "src/app/sw.ts", // Your worker source
	swDest: "public/sw.js", // The output file
	disable: false,
	// Serwist-specific options can go here
});

export default withSerwist(nextConfig);
