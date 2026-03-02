// Migration script to import existing hardcoded data into MongoDB
// Run this once to populate your database with existing content

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const VideoContent = require('./models/VideoContent');
const PricingContent = require('./models/PricingContent');

// Existing Video Testimonials Data (from VideoReviewsSection.tsx)
const videoTestimonials = [
  {
    testimonialId: 1,
    name: "Jennifer Parker",
    position: "Marketing Director, Summit Brands",
    avatar: "J",
    borderColor: "border-yellow-400",
    videoUrl: "/client_videos/client_video_3.mp4",
    thumbnail: "/client_videos/thumb_3.png",
    textOverlay: "",
    followers: "134K Followers",
    isActive: true,
    order: 0
  },
  {
    testimonialId: 2,
    name: "Sarah Williams",
    position: "E-commerce Manager, Urban Style",
    avatar: "S",
    borderColor: "border-cyan-500",
    videoUrl: "/client_videos/client_video_5.mp4",
    thumbnail: "/client_videos/thumb_5.png",
    textOverlay: "",
    followers: "268K Followers",
    isActive: true,
    order: 1
  },
  {
    testimonialId: 3,
    name: "Alex Chen",
    position: "Content Creator, Pixel Studios",
    avatar: "A",
    borderColor: "border-amber-500",
    videoUrl: "/client_videos/client_video_1.mp4",
    thumbnail: "/client_videos/thumb_1.png",
    textOverlay: "I used to think growing on Instagram",
    followers: "304K Followers",
    isActive: true,
    order: 2
  },
  {
    testimonialId: 4,
    name: "Jessica Morgan",
    position: "Fashion Model, Elite Modeling",
    avatar: "J",
    borderColor: "border-red-500",
    videoUrl: "/client_videos/client_video_4.mp4",
    thumbnail: "/client_videos/thumb_4.png",
    textOverlay: "",
    followers: "456K Followers",
    isActive: true,
    order: 3
  },
  {
    testimonialId: 5,
    name: "David Wilson",
    position: "Tech Entrepreneur, Byte Innovations",
    avatar: "D",
    borderColor: "border-green-500",
    videoUrl: "/client_videos/client_video_2.mp4",
    thumbnail: "/client_videos/thumb_2.png",
    textOverlay: "",
    followers: "198K Followers",
    isActive: true,
    order: 4
  }
];

// Existing Pricing Plans Data (from PricingComponent.tsx)
const pricingPlans = [
  {
    planId: "starter-growth",
    name: "Starter Growth Plan",
    icon: "Zap",
    monthlyPrice: 99,
    annualPrice: 950,
    description: "Perfect for individuals, creators, and small businesses starting their Instagram growth journey with real reach and organic results",
    features: [
      { title: "100,000+ Monthly Organic Reach Guaranteed", included: true },
      { title: "Your content shown to real, targeted users — no ads, no bots", included: true },
      { title: "Genuine Interactions Included", included: true },
      { title: "Natural Follower Growth", included: true },
      { title: "Campaign Starts Within 48 Hours", included: true },
      { title: "Hands-Off: Fully Managed By Our Team", included: true },
      { title: "Dedicated Account Manager", included: true }
    ],
    cta: "Kickstart Your Reach Today",
    accentGradient: "from-blue-400 to-blue-600",
    accentLight: "bg-blue-50",
    accentText: "text-blue-600",
    accentBorder: "border-blue-200",
    popular: false,
    badge: null,
    highlight: "Reach 100,000+ Real Users Monthly",
    isActive: true,
    order: 0
  },
  {
    planId: "pro-expansion",
    name: "Pro Expansion Plan",
    icon: "TrendingUp",
    monthlyPrice: 199,
    annualPrice: 1990,
    description: "Ideal for influencers, brands, and businesses looking to scale rapidly with massive reach, unlimited engagement, and natural follower growth",
    features: [
      { title: "300,000+ Monthly Organic Reach Guaranteed", included: true },
      { title: "Your content promoted to a highly targeted, high-intent audience", included: true },
      { title: "Unlimited Interactions & Views", included: true },
      { title: "Natural Follower Growth", included: true },
      { title: "AI-Enhanced Audience Targeting", included: true },
      { title: "Priority Campaign Launch Within 48 Hours", included: true },
      { title: "Dedicated Growth Manager", included: true },
      { title: "24/7 Premium Support", included: true },
      { title: "100% Hands-Off for You", included: true }
    ],
    cta: "Reach Bigger. Grow Smarter. Start Today",
    accentGradient: "from-purple-500 to-violet-600",
    accentLight: "bg-purple-50",
    accentText: "text-purple-600",
    accentBorder: "border-purple-200",
    popular: true,
    badge: "Most Popular",
    highlight: "Reach Up to 300,000+ Targeted Users Monthly",
    isActive: true,
    order: 1
  },
  {
    planId: "custom-elite",
    name: "Custom Elite Plan",
    icon: "Users",
    monthlyPrice: null,
    annualPrice: null,
    description: "For brands, agencies & creators ready to go viral",
    features: [
      { title: "Unlimited Growth Potential", included: true },
      { title: "Custom Campaigns + Niche Targeting", included: true },
      { title: "AI-Powered & Manual Outreach", included: true },
      { title: "Multi-Channel Strategy (Instagram + more)", included: true },
      { title: "Advanced Reporting & Data Insights", included: true },
      { title: "Strategy Calls with Our Growth Team", included: true },
      { title: "Custom Solutions For Your Brand", included: true }
    ],
    cta: "Let's Talk — Book a Free Strategy Call",
    accentGradient: "from-teal-400 to-teal-600",
    accentLight: "bg-teal-50",
    accentText: "text-teal-600",
    accentBorder: "border-teal-200",
    popular: false,
    badge: "Enterprise Ready",
    highlight: "Unlimited Growth — You Set the Vision",
    isActive: true,
    order: 2
  }
];

// Migration function
async function migrateData() {
  try {
    console.log('🚀 Starting data migration...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social-media-marketing');
    console.log('✅ Connected to MongoDB\n');

    // Migrate Video Testimonials
    console.log('📹 Migrating Video Testimonials...');
    
    // Check if data already exists
    const existingVideos = await VideoContent.countDocuments();
    if (existingVideos > 0) {
      console.log(`⚠️  Found ${existingVideos} existing video testimonials.`);
      console.log('   Skipping video migration to avoid duplicates.');
      console.log('   To force migration, delete existing videos first.\n');
    } else {
      const videoResults = await VideoContent.insertMany(videoTestimonials);
      console.log(`✅ Successfully migrated ${videoResults.length} video testimonials\n`);
      
      // Display migrated videos
      videoResults.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.name} - ${video.position}`);
      });
      console.log('');
    }

    // Migrate Pricing Plans
    console.log('💰 Migrating Pricing Plans...');
    
    // Check if data already exists
    const existingPlans = await PricingContent.countDocuments();
    if (existingPlans > 0) {
      console.log(`⚠️  Found ${existingPlans} existing pricing plans.`);
      console.log('   Skipping pricing migration to avoid duplicates.');
      console.log('   To force migration, delete existing plans first.\n');
    } else {
      const pricingResults = await PricingContent.insertMany(pricingPlans);
      console.log(`✅ Successfully migrated ${pricingResults.length} pricing plans\n`);
      
      // Display migrated plans
      pricingResults.forEach((plan, index) => {
        console.log(`   ${index + 1}. ${plan.name} - $${plan.monthlyPrice || 'Custom'}/month`);
      });
      console.log('');
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Video Testimonials: ${await VideoContent.countDocuments()} total`);
    console.log(`   - Pricing Plans: ${await PricingContent.countDocuments()} total\n`);
    
    console.log('💡 Next Steps:');
    console.log('   1. Start your backend server: npm run dev');
    console.log('   2. Login to admin panel');
    console.log('   3. Navigate to Content Management');
    console.log('   4. View and edit your migrated content\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check MongoDB is running');
    console.error('   2. Verify MONGO_URI in .env file');
    console.error('   3. Ensure models are correctly defined');
    console.error('   4. Check for validation errors in data\n');
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
console.log('═══════════════════════════════════════════════════════');
console.log('         SOCIALBOOST - DATA MIGRATION SCRIPT          ');
console.log('═══════════════════════════════════════════════════════\n');

migrateData();