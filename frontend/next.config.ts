/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          "http://shortlyst-alb-1378051991.us-east-1.elb.amazonaws.com/:path*",
      },
    ];
  },
};

export default nextConfig;