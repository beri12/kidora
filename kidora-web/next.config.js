/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The course creator moved out of /dashboard: that tree has its own Navbar
  // and Sidebar layout, so a page there that also renders TeacherShell drew
  // two sets of chrome. The three-step wizard it replaced is gone entirely.
  async redirects() {
    return [
      { source: '/dashboard/teacher/create-course', destination: '/teacher/courses/new', permanent: false },
      { source: '/dashboard/teacher/create-course/:step', destination: '/teacher/courses/new', permanent: false },
    ];
  },
};

module.exports = nextConfig;
