import {
  Archive,
  Bookmark,
  BookOpen,
  Brush,
  Camera,
  Code,
  CuboidIcon,
  FileText,
  Grid,
  Home,
  ImageIcon,
  LayoutGrid,
  Layers,
  Palette,
  Sparkles,
  Type,
  Users,
  Video,
} from "lucide-react"

import {
  BarChart2,
  Calendar,
  Clock,
  PenSquare,
  Settings2,
  TrendingUp,
  Zap,
} from "lucide-react"

// ─── Apps ────────────────────────────────────────────────────────────────────
export const apps = [
  { name: "PixelMaster",   icon: <ImageIcon  className="text-violet-500" />,  description: "Advanced image editing and composition",      category: "Creative",    recent: true,  new: false, progress: 100 },
  { name: "VectorPro",     icon: <Brush      className="text-orange-500" />,  description: "Professional vector graphics creation",       category: "Creative",    recent: true,  new: false, progress: 100 },
  { name: "VideoStudio",   icon: <Video      className="text-pink-500" />,    description: "Cinematic video editing and production",      category: "Video",       recent: true,  new: false, progress: 100 },
  { name: "MotionFX",      icon: <Sparkles   className="text-blue-500" />,    description: "Stunning visual effects and animations",      category: "Video",       recent: false, new: false, progress: 100 },
  { name: "PageCraft",     icon: <Layers     className="text-red-500" />,     description: "Professional page design and layout",         category: "Creative",    recent: false, new: false, progress: 100 },
  { name: "UXFlow",        icon: <LayoutGrid className="text-fuchsia-500" />, description: "Intuitive user experience design",            category: "Design",      recent: false, new: true,  progress: 85  },
  { name: "PhotoLab",      icon: <Camera     className="text-teal-500" />,    description: "Advanced photo editing and organization",     category: "Photography", recent: false, new: false, progress: 100 },
  { name: "DocMaster",     icon: <FileText   className="text-red-600" />,     description: "Document editing and management",             category: "Document",    recent: false, new: false, progress: 100 },
  { name: "WebCanvas",     icon: <Code       className="text-emerald-500" />, description: "Web design and development",                  category: "Web",         recent: false, new: true,  progress: 70  },
  { name: "3DStudio",      icon: <CuboidIcon className="text-indigo-500" />,  description: "3D modeling and rendering",                   category: "3D",          recent: false, new: true,  progress: 60  },
  { name: "FontForge",     icon: <Type       className="text-amber-500" />,   description: "Typography and font creation",                category: "Typography",  recent: false, new: false, progress: 100 },
  { name: "ColorPalette",  icon: <Palette    className="text-purple-500" />,  description: "Color scheme creation and management",        category: "Design",      recent: false, new: false, progress: 100 },
]

// ─── Recent Files ─────────────────────────────────────────────────────────────
export const recentFiles = [
  { name: "Brand Redesign.pxm",       app: "PixelMaster",  modified: "2 hours ago",  icon: <ImageIcon  className="text-violet-500" />,  shared: true,  size: "24.5 MB", collaborators: 3 },
  { name: "Company Logo.vec",          app: "VectorPro",    modified: "Yesterday",    icon: <Brush      className="text-orange-500" />,  shared: true,  size: "8.2 MB",  collaborators: 2 },
  { name: "Product Launch Video.vid",  app: "VideoStudio",  modified: "3 days ago",   icon: <Video      className="text-pink-500" />,    shared: false, size: "1.2 GB",  collaborators: 0 },
  { name: "UI Animation.mfx",          app: "MotionFX",     modified: "Last week",    icon: <Sparkles   className="text-blue-500" />,    shared: true,  size: "345 MB",  collaborators: 4 },
  { name: "Magazine Layout.pgc",       app: "PageCraft",    modified: "2 weeks ago",  icon: <Layers     className="text-red-500" />,     shared: false, size: "42.8 MB", collaborators: 0 },
  { name: "Mobile App Design.uxf",     app: "UXFlow",       modified: "3 weeks ago",  icon: <LayoutGrid className="text-fuchsia-500" />, shared: true,  size: "18.3 MB", collaborators: 5 },
  { name: "Product Photography.phl",   app: "PhotoLab",     modified: "Last month",   icon: <Camera     className="text-teal-500" />,    shared: false, size: "156 MB",  collaborators: 0 },
]

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = [
  { name: "Website Redesign",   description: "Complete overhaul of company website",        progress: 75, dueDate: "June 15, 2025",    members: 4, files: 23 },
  { name: "Mobile App Launch",  description: "Design and assets for new mobile application", progress: 60, dueDate: "July 30, 2025",    members: 6, files: 42 },
  { name: "Brand Identity",     description: "New brand guidelines and assets",              progress: 90, dueDate: "May 25, 2025",     members: 3, files: 18 },
  { name: "Marketing Campaign", description: "Summer promotion materials",                   progress: 40, dueDate: "August 10, 2025",  members: 5, files: 31 },
]

// ─── Tutorials ────────────────────────────────────────────────────────────────
export const tutorials = [
  { title: "Mastering Digital Illustration",  description: "Learn advanced techniques for creating stunning digital art",      duration: "1h 45m", level: "Advanced",     instructor: "Sarah Chen",        category: "Illustration", views: "24K" },
  { title: "UI/UX Design Fundamentals",       description: "Essential principles for creating intuitive user interfaces",       duration: "2h 20m", level: "Intermediate", instructor: "Michael Rodriguez", category: "Design",       views: "56K" },
  { title: "Video Editing Masterclass",       description: "Professional techniques for cinematic video editing",               duration: "3h 10m", level: "Advanced",     instructor: "James Wilson",      category: "Video",        views: "32K" },
  { title: "Typography Essentials",           description: "Create beautiful and effective typography for any project",         duration: "1h 30m", level: "Beginner",     instructor: "Emma Thompson",     category: "Typography",   views: "18K" },
  { title: "Color Theory for Designers",      description: "Understanding color relationships and psychology",                  duration: "2h 05m", level: "Intermediate", instructor: "David Kim",         category: "Design",       views: "41K" },
]

// ─── Community Posts ──────────────────────────────────────────────────────────
export const communityPosts = [
  { title: "Minimalist Logo Design",    author: "Alex Morgan",    likes: 342, comments: 28, image: "/placeholder.svg?height=300&width=400", time: "2 days ago"  },
  { title: "3D Character Concept",      author: "Priya Sharma",   likes: 518, comments: 47, image: "/placeholder.svg?height=300&width=400", time: "1 week ago"  },
  { title: "UI Dashboard Redesign",     author: "Thomas Wright",  likes: 276, comments: 32, image: "/placeholder.svg?height=300&width=400", time: "3 days ago"  },
  { title: "Product Photography Setup", author: "Olivia Chen",    likes: 189, comments: 15, image: "/placeholder.svg?height=300&width=400", time: "5 days ago"  },
]

// // ─── Sidebar Nav ──────────────────────────────────────────────────────────────
// export const sidebarItems = [
//   { title: "Home",      icon: <Home     />, isActive: true },
//   { title: "Apps",      icon: <Grid     />, badge: "2", items: [{ title: "All Apps", url: "#" }, { title: "Recent", url: "#" }, { title: "Updates", url: "#", badge: "2" }, { title: "Installed", url: "#" }] },
//   { title: "Files",     icon: <FileText />, items: [{ title: "Recent", url: "#" }, { title: "Shared with me", url: "#", badge: "3" }, { title: "Favorites", url: "#" }, { title: "Trash", url: "#" }] },
//   { title: "Projects",  icon: <Layers   />, badge: "4", items: [{ title: "Active Projects", url: "#", badge: "4" }, { title: "Archived", url: "#" }, { title: "Templates", url: "#" }] },
//   { title: "Learn",     icon: <BookOpen />, items: [{ title: "Tutorials", url: "#" }, { title: "Courses", url: "#" }, { title: "Webinars", url: "#" }, { title: "Resources", url: "#" }] },
//   { title: "Community", icon: <Users    />, items: [{ title: "Explore", url: "#" }, { title: "Following", url: "#" }, { title: "Challenges", url: "#" }, { title: "Events", url: "#" }] },
//   { title: "Resources", icon: <Bookmark />, items: [{ title: "Stock Photos", url: "#" }, { title: "Fonts", url: "#" }, { title: "Icons", url: "#" }, { title: "Templates", url: "#" }] },
// ]







// ─── Scheduled / Upcoming Posts ───────────────────────────────────────────────
export const scheduledPosts = [
  {
    id: "1",
    title: "5 lessons I learned scaling a SaaS to $1M ARR",
    preview: "After 3 years of building in public, here's what nobody tells you about the grind...",
    scheduledAt: "Today, 9:00 AM",
    status: "publishing_soon",
    type: "thought_leadership",
    estimatedReach: "2.4K",
    hashtags: ["#SaaS", "#StartupLife", "#Founder"],
    mediaType: "text",
  },
  {
    id: "2",
    title: "Why most LinkedIn content fails (and what to do instead)",
    preview: "I've studied 500+ viral LinkedIn posts. The pattern is surprisingly simple...",
    scheduledAt: "Today, 2:00 PM",
    status: "scheduled",
    type: "educational",
    estimatedReach: "3.1K",
    hashtags: ["#LinkedIn", "#ContentMarketing", "#PersonalBrand"],
    mediaType: "carousel",
  },
  {
    id: "3",
    title: "We just hit 10,000 newsletter subscribers 🎉",
    preview: "18 months ago I had 0. Here's the exact strategy that got us here...",
    scheduledAt: "Tomorrow, 8:30 AM",
    status: "scheduled",
    type: "milestone",
    estimatedReach: "5.2K",
    hashtags: ["#Newsletter", "#Growth", "#Milestone"],
    mediaType: "image",
  },
  {
    id: "4",
    title: "The cold outreach template with 43% reply rate",
    preview: "Most cold messages get ignored in 2 seconds. This one actually works...",
    scheduledAt: "Thu, 10:00 AM",
    status: "draft",
    type: "how_to",
    estimatedReach: "1.8K",
    hashtags: ["#Sales", "#Outreach", "#B2B"],
    mediaType: "text",
  },
  {
    id: "5",
    title: "Hiring a Head of Growth — here's what I'm looking for",
    preview: "After 12 interviews, I've learned that the best candidates all share one trait...",
    scheduledAt: "Fri, 9:00 AM",
    status: "scheduled",
    type: "hiring",
    estimatedReach: "4.0K",
    hashtags: ["#Hiring", "#Growth", "#Startup"],
    mediaType: "text",
  },
]

// ─── Analytics — Recent Post Performance ─────────────────────────────────────
export const recentPostPerformance = [
  {
    id: "p1",
    title: "How I built my first SaaS in 30 days",
    publishedAt: "Mon, May 5",
    impressions: 12400,
    reactions: 347,
    comments: 89,
    reposts: 42,
    clicks: 310,
    engagementRate: 3.8,
    trend: "up",
  },
  {
    id: "p2",
    title: "The founder's guide to cold email",
    publishedAt: "Sat, May 3",
    impressions: 8200,
    reactions: 219,
    comments: 54,
    reposts: 28,
    clicks: 187,
    engagementRate: 3.1,
    trend: "up",
  },
  {
    id: "p3",
    title: "Stop optimising your LinkedIn profile — do this instead",
    publishedAt: "Wed, Apr 30",
    impressions: 6100,
    reactions: 142,
    comments: 31,
    reposts: 11,
    clicks: 98,
    engagementRate: 2.4,
    trend: "down",
  },
  {
    id: "p4",
    title: "7 tools I use every day as a solo founder",
    publishedAt: "Mon, Apr 28",
    impressions: 19800,
    reactions: 612,
    comments: 143,
    reposts: 97,
    clicks: 542,
    engagementRate: 4.3,
    trend: "up",
  },
]

// ─── KPI Summary Cards ────────────────────────────────────────────────────────
export const kpiCards = [
  { label: "Total Impressions",   value: "46.5K",  delta: "+18%", deltaDir: "up",   icon: "eye",     period: "vs last 30 days" },
  { label: "Avg. Engagement Rate", value: "3.9%",  delta: "+0.6%", deltaDir: "up",  icon: "zap",     period: "vs last 30 days" },
  { label: "Total Reactions",      value: "1,320", delta: "+24%", deltaDir: "up",   icon: "heart",   period: "vs last 30 days" },
  { label: "Posts Published",      value: "12",    delta: "+3",   deltaDir: "up",   icon: "pen",     period: "vs last 30 days" },
  { label: "Profile Clicks",       value: "1,137", delta: "-4%",  deltaDir: "down", icon: "pointer", period: "vs last 30 days" },
  { label: "New Followers",        value: "284",   delta: "+31%", deltaDir: "up",   icon: "users",   period: "vs last 30 days" },
]

// ─── Weekly impressions chart data ────────────────────────────────────────────
export const weeklyImpressions = [
  { day: "Mon", impressions: 3200, reactions: 98 },
  { day: "Tue", impressions: 1800, reactions: 45 },
  { day: "Wed", impressions: 6100, reactions: 142 },
  { day: "Thu", impressions: 2400, reactions: 71 },
  { day: "Fri", impressions: 8200, reactions: 219 },
  { day: "Sat", impressions: 4100, reactions: 103 },
  { day: "Sun", impressions: 1200, reactions: 29 },
]

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
export const sidebarItems = [
  { title: "Dashboard",  icon: <Home       />, isActive: true  },
  { title: "Compose",    icon: <PenSquare  />, badge: "New"    },
  { title: "Schedule",   icon: <Calendar   />, items: [{ title: "Queue", url: "#" }, { title: "Calendar View", url: "#" }, { title: "Drafts", url: "#", badge: "4" }] },
  { title: "Analytics",  icon: <BarChart2  />, items: [{ title: "Post Performance", url: "#" }, { title: "Audience Insights", url: "#" }, { title: "Best Times", url: "#" }] },
  { title: "AI Writer",  icon: <Sparkles   />, badge: "✨"     },
  { title: "Templates",  icon: <LayoutGrid />, items: [{ title: "My Templates", url: "#" }, { title: "Browse Library", url: "#" }] },
  { title: "Ideas",      icon: <Bookmark   />, },
  { title: "Settings",   icon: <Settings2  />, items: [{ title: "Account", url: "#" }, { title: "LinkedIn Connection", url: "#" }, { title: "Billing", url: "#" }] },
]