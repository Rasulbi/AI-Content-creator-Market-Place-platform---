export interface PortfolioProject {
  id: string;
  title: string;
  brand: string;
  category: string;
  contentType: string;
  toolsUsed: string[];
  image: string;
  description: string;
  results: string;
  engagement: string;
  reach: string;
}

export interface ClientReview {
  id: string;
  reviewer: string;
  brand: string;
  role: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Creator {
  id: string;
  name: string;
  professionalTitle: string;
  category:
    | "Beauty & Skincare"
    | "Fashion"
    | "Technology"
    | "Fitness & Wellness"
    | "Food"
    | "Travel & Lifestyle";
  avatar: string;
  followers: string;
  followersCount: number;
  engagementRate: string;
  engagementNum: number;
  location: string;
  bio: string;
  skills: string[];
  verifiedSkills: string[];
  isVerified: boolean;
  portfolioCount: number;
  previousBrandCollabs: string[];
  clientRating: number;
  reviewsCount: number;
  reviews: ClientReview[];
  contentTypes: string[];
  platforms: string[];
  portfolio: PortfolioProject[];
  availability: "Available for immediate hire" | "Available in 1 week" | "Booked this month";
  priceRange: string;
  baseMatchScore: number;
  youtubeSubscribers?: string;
}

export const CREATORS_DATA: Creator[] = [
  // 1. BEAUTY & SKINCARE
  {
    id: "ananya-rao",
    name: "Ananya Rao",
    professionalTitle: "Beauty & Skincare Creator",
    category: "Beauty & Skincare",
    avatar: "/images/anjali.jpg",
    followers: "125K",
    followersCount: 125000,
    engagementRate: "8.7%",
    engagementNum: 8.7,
    location: "Mumbai, India",
    bio: "AI-enhanced beauty storyteller and aesthetic skincare specialist. Creating high-converting UGC tutorials, clinical ingredient breakdowns, and honest before-and-after reviews with cinematic visuals.",
    skills: [
      "Skincare",
      "Product Reviews",
      "Instagram Reels",
      "UGC",
      "AI Image Generation",
      "Ingredient Analysis",
      "Beauty Lighting",
    ],
    verifiedSkills: ["Skincare", "Product Reviews", "Instagram Reels", "UGC"],
    isVerified: true,
    portfolioCount: 24,
    previousBrandCollabs: ["GlowUp Skincare", "Nykaa", "The Derma Co", "Minimalist", "Dot & Key"],
    clientRating: 4.9,
    reviewsCount: 38,
    availability: "Available for immediate hire",
    priceRange: "₹ 20,000 - ₹ 35,000",
    baseMatchScore: 94,
    contentTypes: ["Instagram Reels", "Product Reviews", "UGC Video", "Carousel Tutorials"],
    platforms: ["Instagram", "YouTube Shorts"],
    reviews: [
      {
        id: "rev-1",
        reviewer: "Simran T.",
        brand: "GlowUp Skincare",
        role: "Growth Marketing Lead",
        rating: 5.0,
        comment:
          "Ananya delivered 3 Reels that exceeded our target ROI by 180%. The natural aesthetic and AI-refined lighting resonated strongly with women aged 20-35.",
        date: "2 weeks ago",
      },
      {
        id: "rev-2",
        reviewer: "Arjun M.",
        brand: "The Derma Co",
        role: "Brand Partnerships",
        rating: 4.8,
        comment:
          "Exceptional understanding of active ingredients like Niacinamide and Hyaluronic Acid. Super professional and delivered ahead of deadline.",
        date: "1 month ago",
      },
    ],
    portfolio: [
      {
        id: "p-1",
        title: "Botanical Face Cream 14-Day Hydration Challenge",
        brand: "Aurora Botanicals",
        category: "Beauty & Skincare",
        contentType: "Instagram Reel & UGC Review",
        toolsUsed: ["Midjourney v6", "CapCut Pro", "Sony FX3", "Color Finale"],
        image: "/images/portfolio-skincare.jpg",
        description:
          "Created a 3-part aesthetic video campaign demonstrating skin barrier restoration using macro texture shots and verified moisture meter testing.",
        results: "2.4M organic views, 18.4% click-through rate to product page, 820+ direct orders.",
        engagement: "9.2% Engagement Rate",
        reach: "3.1M Total Reach",
      },
      {
        id: "p-2",
        title: "Clean Beauty Sunscreen Zero-Whitecast UGC",
        brand: "Suncare India",
        category: "Beauty & Skincare",
        contentType: "UGC Product Review",
        toolsUsed: ["Runway Gen-2", "Lightroom", "iPhone 15 Pro Max"],
        image: "/images/glowup-cream.jpg",
        description:
          "Macro texture analysis and outdoor sweat-resistance test comparing traditional SPF vs featherlight gel formulation.",
        results: "1.1M Views, 14,000 saves, featured as official Meta ad creative.",
        engagement: "8.4% Engagement Rate",
        reach: "1.4M Total Reach",
      },
    ],
  },

  // 2. FASHION CREATOR
  {
    id: "neha-kapoor",
    name: "Neha Kapoor",
    professionalTitle: "Fashion & Style Creator",
    category: "Fashion",
    avatar: "/images/neha.jpg",
    followers: "98K",
    followersCount: 98000,
    engagementRate: "7.2%",
    engagementNum: 7.2,
    location: "Delhi, India",
    bio: "Styling consultant and avant-garde digital fashion creator blending AI 3D styling simulations with wearable street style and sustainable lookbooks.",
    skills: [
      "Fashion Styling",
      "Lookbook Production",
      "Instagram Reels",
      "Runway Trends",
      "AI Outfit Visualization",
      "Sustainable Wardrobe",
    ],
    verifiedSkills: ["Fashion Styling", "Lookbook Production", "Instagram Reels"],
    isVerified: true,
    portfolioCount: 19,
    previousBrandCollabs: ["Zara", "H&M India", "FabIndia", "Myntra Studio", "Urbanic"],
    clientRating: 4.8,
    reviewsCount: 26,
    availability: "Available in 1 week",
    priceRange: "₹ 25,000 - ₹ 40,000",
    baseMatchScore: 82,
    contentTypes: ["Reels Lookbooks", "Outfit Transitions", "Streetstyle Editorial", "Stories"],
    platforms: ["Instagram", "Pinterest"],
    reviews: [
      {
        id: "rev-3",
        reviewer: "Kavita S.",
        brand: "Myntra Studio",
        role: "Campaign Director",
        rating: 4.9,
        comment:
          "Neha's transitions are world-class. Her curated capsule wardrobe reel brought our autumn collection 45K saved items in 48 hours.",
        date: "3 weeks ago",
      },
    ],
    portfolio: [
      {
        id: "p-3",
        title: "Monochrome Architectural Streetwear Autumn Capsule",
        brand: "Urban Chic",
        category: "Fashion",
        contentType: "Cinematic Reel Lookbook",
        toolsUsed: ["Midjourney", "Premiere Pro", "After Effects", "DaVinci Resolve"],
        image: "/images/portfolio-fashion.jpg",
        description:
          "5 wearable neutral outfits styled with oversized trench coats against modernist brutalist cityscapes.",
        results: "1.8M Views, 28,000 bookmark saves, sold out outerwear pieces in 3 days.",
        engagement: "8.1% Engagement Rate",
        reach: "2.3M Reach",
      },
    ],
  },

  // 3. TECHNOLOGY CREATOR
  {
    id: "kabir-singh",
    name: "Kabir Singh",
    professionalTitle: "Technology & AI Gadget Creator",
    category: "Technology",
    avatar: "/images/kabir.jpg",
    followers: "185K",
    followersCount: 185000,
    engagementRate: "6.8%",
    engagementNum: 6.8,
    location: "Bengaluru, India",
    bio: "Software engineer turned tech reviewer. Translating complex AI tools, consumer electronics, and futuristic desk setups into high-octane, transparent tech breakdowns.",
    skills: [
      "Tech Unboxing",
      "AI Software Benchmarks",
      "Product Reviews",
      "YouTube Longform",
      "Scriptwriting",
      "Desk Setup Aesthetics",
      "Cinematography",
    ],
    verifiedSkills: ["Tech Unboxing", "Product Reviews", "AI Software Benchmarks"],
    isVerified: true,
    portfolioCount: 31,
    previousBrandCollabs: ["Nothing Tech", "OnePlus", "Logitech", "ASUS ROG", "Notion", "Perplexity"],
    clientRating: 4.9,
    reviewsCount: 42,
    availability: "Available for immediate hire",
    priceRange: "₹ 35,000 - ₹ 55,000",
    baseMatchScore: 88,
    youtubeSubscribers: "140K",
    contentTypes: ["YouTube Breakdowns", "Instagram Reels", "Desk Tours", "Benchmark Tests"],
    platforms: ["YouTube", "Instagram", "X / Twitter", "LinkedIn"],
    reviews: [
      {
        id: "rev-4",
        reviewer: "Devendra P.",
        brand: "Nothing Tech",
        role: "Regional PR Head",
        rating: 5.0,
        comment:
          "Kabir made the most detailed yet easy-to-understand breakdown of our new AI launcher. The audience was highly engaged and comment section sentiment was 98% positive.",
        date: "1 week ago",
      },
    ],
    portfolio: [
      {
        id: "p-4",
        title: "Next-Gen AI Workspace & UltraWide Monitor Ecosystem",
        brand: "Aether AI Displays",
        category: "Technology",
        contentType: "YouTube Review & 60s Reel",
        toolsUsed: ["OBS Studio", "Blender 3D", "Premiere Pro", "Blackmagic Pocket 6K"],
        image: "/images/portfolio-tech.jpg",
        description:
          "In-depth benchmark testing of curved workspace displays integrated with real-time neural network productivity assistants.",
        results: "920K YouTube Views, 4.2K click-throughs to pre-order link.",
        engagement: "7.9% Engagement Rate",
        reach: "1.5M Total Reach",
      },
    ],
  },

  // 4. FITNESS & WELLNESS CREATOR
  {
    id: "riya-mehta",
    name: "Riya Mehta",
    professionalTitle: "Fitness & Holistic Wellness Creator",
    category: "Fitness & Wellness",
    avatar: "/images/riya.jpg",
    followers: "156K",
    followersCount: 156000,
    engagementRate: "7.6%",
    engagementNum: 7.6,
    location: "Bengaluru, India",
    bio: "Certified functional trainer and holistic nutritionist. Guiding busy professionals through 20-minute daily home workouts, clean recovery routines, and sustainable lifestyle habits.",
    skills: [
      "Mobility Training",
      "Clean Nutrition",
      "Activewear Reviews",
      "Instagram Reels",
      "Fitness UGC",
      "Wellness Coaching",
    ],
    verifiedSkills: ["Mobility Training", "Clean Nutrition", "Activewear Reviews"],
    isVerified: true,
    portfolioCount: 22,
    previousBrandCollabs: ["Cult.fit", "Fast&Up", "Nike India", "Oziva", "Whoop"],
    clientRating: 4.8,
    reviewsCount: 31,
    availability: "Available for immediate hire",
    priceRange: "₹ 20,000 - ₹ 32,000",
    baseMatchScore: 84,
    contentTypes: ["Workout Follow-Alongs", "Supplement Reviews", "Meal Prep Reels", "Fitness Challenges"],
    platforms: ["Instagram", "YouTube"],
    reviews: [
      {
        id: "rev-5",
        reviewer: "Aditi G.",
        brand: "Cult.fit",
        role: "Campaign Lead",
        rating: 4.8,
        comment:
          "Riya created an authentic 7-day morning mobility challenge. Over 12,000 people signed up for our partner trial through her dedicated link.",
        date: "3 weeks ago",
      },
    ],
    portfolio: [
      {
        id: "p-5",
        title: "21-Day Posture & Morning Mobility Habit Loop",
        brand: "VitalMovement",
        category: "Fitness & Wellness",
        contentType: "Video Series & Daily Carousel Guides",
        toolsUsed: ["CapCut", "Lightroom Mobile", "Sony A7 IV"],
        image: "/images/portfolio-skincare.jpg",
        description:
          "Daily digestible exercises solving lower back stiffness and computer neck fatigue for remote tech professionals.",
        results: "3.4M cumulative views across series, 42,000 total shares.",
        engagement: "8.6% Engagement Rate",
        reach: "4.1M Reach",
      },
    ],
  },

  // 5. FOOD CREATOR
  {
    id: "rohan-joshi",
    name: "Rohan Joshi",
    professionalTitle: "Culinary & Food Content Creator",
    category: "Food",
    avatar: "/images/rohan.jpg",
    followers: "142K",
    followersCount: 142000,
    engagementRate: "8.2%",
    engagementNum: 8.2,
    location: "Pune, India",
    bio: "Chef and food filmmaker combining quick gourmet recipe storytelling with knife skills, farm-fresh ingredients, and satisfying ASMR sound design.",
    skills: [
      "Gourmet Recipe Dev",
      "Food Styling",
      "Culinary ASMR",
      "Product Placement",
      "Kitchen Appliance Reviews",
      "Instagram Reels",
    ],
    verifiedSkills: ["Gourmet Recipe Dev", "Food Styling", "Culinary ASMR"],
    isVerified: true,
    portfolioCount: 28,
    previousBrandCollabs: ["Amul", "Wonderchef", "Saffola", "Borges Olive Oil", "Zomato"],
    clientRating: 4.9,
    reviewsCount: 35,
    availability: "Available in 1 week",
    priceRange: "₹ 22,000 - ₹ 35,000",
    baseMatchScore: 86,
    contentTypes: ["60s Recipe Reels", "ASMR Cooking", "Kitchen Gadget Reviews", "Story Polling"],
    platforms: ["Instagram", "YouTube Shorts"],
    reviews: [
      {
        id: "rev-6",
        reviewer: "Manish K.",
        brand: "Wonderchef",
        role: "Head of Influencer Marketing",
        rating: 5.0,
        comment:
          "Rohan's recipe video featuring our cast iron skillet achieved our highest single-day conversion spike of Q3. Highly recommended!",
        date: "2 weeks ago",
      },
    ],
    portfolio: [
      {
        id: "p-6",
        title: "Modern Artisanal Pan-Seared Duck Breast with Herb Puree",
        brand: "Artisan Cookware Co.",
        category: "Food",
        contentType: "Cinematic ASMR Recipe Video",
        toolsUsed: ["DaVinci Resolve Studio", "Rode Wireless Pro", "Canon R5 C"],
        image: "/images/portfolio-food.jpg",
        description:
          "Crisp skin sizzling sound design, vibrant plating, and zero-waste vegetable garnish tutorial.",
        results: "1.9M Views, 16,800 recipe saves, massive positive engagement.",
        engagement: "9.4% Engagement Rate",
        reach: "2.5M Total Reach",
      },
    ],
  },

  // 6. TRAVEL & LIFESTYLE CREATOR
  {
    id: "priya-reddy",
    name: "Priya Reddy",
    professionalTitle: "Travel & Luxury Lifestyle Creator",
    category: "Travel & Lifestyle",
    avatar: "/images/priya.jpg",
    followers: "210K",
    followersCount: 210000,
    engagementRate: "6.4%",
    engagementNum: 6.4,
    location: "Hyderabad, India",
    bio: "Slow travel advocate and luxury resort storyteller capturing hidden island villas, boutique hotel experiences, and aesthetic travel packing guides.",
    skills: [
      "Travel Vlogging",
      "Hotel Reviews",
      "Drone Cinematography",
      "Itinerary Planning",
      "Instagram Reels",
      "Lifestyle Photography",
    ],
    verifiedSkills: ["Travel Vlogging", "Hotel Reviews", "Drone Cinematography"],
    isVerified: true,
    portfolioCount: 33,
    previousBrandCollabs: ["Taj Hotels", "Airbnb", "Samsonite", "MakeMyTrip", "Dyson"],
    clientRating: 4.8,
    reviewsCount: 39,
    availability: "Available for immediate hire",
    priceRange: "₹ 30,000 - ₹ 50,000",
    baseMatchScore: 85,
    contentTypes: ["Cinematic Drone Reels", "Resort Walkthroughs", "Itinerary Carousels", "Packing Guides"],
    platforms: ["Instagram", "YouTube", "Pinterest"],
    reviews: [
      {
        id: "rev-7",
        reviewer: "Naveen V.",
        brand: "Taj Luxury Resorts",
        role: "Digital Communications",
        rating: 4.9,
        comment:
          "Priya captured the essence of our wellness retreat with breathtaking drone footage. Direct bookings through her partner code exceeded targets by 30%.",
        date: "1 month ago",
      },
    ],
    portfolio: [
      {
        id: "p-7",
        title: "Cliffside Sunset Villa Walkthrough & Eco-Luxury Retreat",
        brand: "Azure Island Sanctuary",
        category: "Travel & Lifestyle",
        contentType: "Drone Reel & Experiential Storytelling",
        toolsUsed: ["DJI Mini 4 Pro", "Sony FX30", "Final Cut Pro", "Lightroom"],
        image: "/images/portfolio-fashion.jpg",
        description:
          "Experiential hotel showcase emphasizing sunrise yoga over the infinity pool, farm-to-table cuisine, and sustainable architecture.",
        results: "2.7M Views, 31,000 saves, 450 direct inquiry messages to hotel.",
        engagement: "7.8% Engagement Rate",
        reach: "3.2M Total Reach",
      },
    ],
  },
];
