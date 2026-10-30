// The public website (thekitelc.com), copied from the Wix site. Each page is a
// list of sections of a few fixed kinds, so the editor can change words and
// photos without touching the layout. Photos live in public/site.

export const ENROLL = "https://docs.google.com/forms/d/e/1FAIpQLSdseIajX5pFFMQlDNf8qOEWrwNwJqnTWD7oAyLYepweh7OdBQ/viewform";
export const ESL_SIGNUP = "https://docs.google.com/forms/d/e/1FAIpQLSczFAwDPL5-Vq14Bs6FJix4vCBOmgEtz8qTZUm50NB1oaW1Aw/viewform";
export const ECE_SIGNUP = "https://docs.google.com/forms/d/e/1FAIpQLSdYv2YfbSjjngcMLThpG7oYS9ji1ChjVcpB9UOmnmlrhn6duw/viewform";
export const DONATE = "https://www.zeffy.com/en-US/donation-form/donate-to-the-kite-learning-center";

export const SITE = {
  name: "The KITE Learning Center",
  phone: "(614) 598-8991",
  email: "thekitelc@gmail.com",
  address: ["5100 Dierker Rd.", "Columbus, Ohio 43220"],
  instagram: "https://www.instagram.com/thekitelearningcenter/",
  facebook: "https://www.facebook.com/profile.php?id=100092585280876",
  footnote: "The KITE Learning Center is a 501(c)3 public charity under the IRS Section 170.",
  // Shown in a banner across the top of every page; empty hides it.
  notice: "No school on November 3rd.",
};

export type Button = { label: string; href: string };
export type Section =
  // Big photo with a headline over it.
  | { kind: "hero"; title: string; text?: string; image: string; buttons?: Button[] }
  // Heading, paragraphs (blank line between), optional photo beside them.
  | { kind: "text"; title?: string; body: string; image?: string; buttons?: Button[] }
  // A heading over a bulleted list (prices, calendar dates, values).
  | { kind: "list"; title: string; items: string[]; note?: string }
  // Numbered cards, e.g. ways to volunteer.
  | { kind: "cards"; title?: string; intro?: string; image?: string; items: { title: string; body: string; button?: Button }[] }
  // Photo tiles with a short caption each.
  | { kind: "tiles"; title?: string; items: { image: string; caption: string; href?: string }[] }
  | { kind: "people"; title?: string; items: { name: string; role?: string; image: string; bio?: string }[] }
  | { kind: "gallery"; title?: string; images: string[] }
  | { kind: "buttons"; buttons: Button[] }
  // Phone, email, address and office hours.
  | { kind: "contact"; title?: string; text?: string };

export type Page = { slug: string; title: string; description: string; sections: Section[] };

const enrollButtons: Button[] = [
  { label: "Register for preschool", href: ENROLL },
  { label: "Register for English class", href: ESL_SIGNUP },
];

export const PAGES: Page[] = [
  {
    slug: "",
    title: "Preschool and English Classes",
    description: "A play-based preschool and free adult English classes for New American families in Columbus, Ohio.",
    sections: [
      {
        kind: "hero",
        image: "8563dd3d",
        title: "Have you ever flown a kite and watched in wonder as it played in the wind?",
        buttons: [{ label: "Enroll here", href: ENROLL }, { label: "Donate", href: DONATE }],
      },
      {
        kind: "text",
        title: "Why \"The KITE\"",
        image: "c688c687",
        body: "A kite represents freedom, exploration, and resilience in the face of wind. It is a fitting symbol for our center as we want to invite children to explore their environment in a way that is voluntary, creative, and free from stress. In building resilience in our children, we want to create opportunities for them to grow and develop to their full potential in all areas of development.",
        buttons: [{ label: "Enroll here", href: ENROLL }],
      },
      {
        kind: "tiles",
        title: "At The KITE Learning Center, we want all children to know...",
        items: [
          { image: "bf805161", caption: "They belong." },
          { image: "9e17e7eb", caption: "They are understood." },
          { image: "4240f701", caption: "They have purpose." },
          { image: "305d9533", caption: "They are secure." },
          { image: "eefbd73f", caption: "They are loved." },
          { image: "2b5947e9", caption: "They are significant." },
        ],
      },
      { kind: "buttons", buttons: [{ label: "Our core beliefs", href: "/core-beliefs" }, { label: "Photos", href: "/photos" }] },
      {
        kind: "text",
        title: "Enroll at The KITE Learning Center!",
        body: "The KITE Learning Center offers Preschool classes for children from 3 to 5 years old, Adult English classes, and American Citizenship classes.\n\nCall (614) 598-8991, email thekitelc@gmail.com, or register below.",
        buttons: enrollButtons,
      },
    ],
  },
  {
    slug: "preschool",
    title: "Preschool",
    description: "Half-day and full-day preschool for children 3 to 5 years old.",
    sections: [
      {
        kind: "text",
        title: "Preschool",
        image: "64c1052d",
        body: "Our Preschool group is for children from 3 to 5 years old. Our learning facilitators will create an inviting and safe environment that will develop their socio-emotional, gross and fine motor, language, and literacy skills. Enrollment is limited to 48 children, and students must be 36 months old by September 1st to enroll.",
        buttons: [{ label: "Enroll here", href: ENROLL }],
      },
      {
        kind: "list",
        title: "Half Day Preschool",
        note: "9:00 AM - 11:45 AM or 12:15 PM - 3:00 PM",
        items: ["3 days per week: $270/month", "4 days per week: $350/month", "5 days per week: $440/month"],
      },
      {
        kind: "list",
        title: "Full Day Preschool",
        note: "9:00 AM - 3:00 PM",
        items: ["3 days per week: $535/month", "4 days per week: $695/month", "4.5 days per week: $792/month"],
      },
      {
        kind: "list",
        title: "The KITE Learning Center Calendar 2026-2027",
        note: "Calendar subject to change with notice.",
        items: [
          "September 8, 2026: Meet the teacher/Open house",
          "September 9: First Day of Preschool & ESL",
          "September 24: No school",
          "October 16: No school",
          "October 19: No school",
          "November 3: No school",
          "November 23 - 27: No School for Thanksgiving",
          "December 11: Last Day of School for Winter Holiday",
          "December 14 - January 3: No School for Winter Holiday",
          "January 4, 2027: Preschool Resumes",
          "January 15: No school",
          "January 18: No school",
          "February 15: No School",
          "March 25 - April 4: No school for Spring break",
          "May 14: Last Day of School before Summer Break",
        ],
      },
      {
        kind: "text",
        title: "Enroll at The KITE Learning Center!",
        body: "Call (614) 598-8991 or email thekitelc@gmail.com to schedule a tour and receive an enrollment packet.",
        buttons: [{ label: "Enroll here", href: ENROLL }],
      },
    ],
  },
  {
    slug: "adultenglishclasses",
    title: "Adult English Classes",
    description: "Free English and citizenship classes for caregivers, September to May.",
    sections: [
      {
        kind: "text",
        title: "Adult English Classes",
        body: "In addition to our inclusive, play-enriched childcare, the KITE Learning Center also offers high-quality ESL courses for caregivers, allowing families with children enrolled in KITE to be eligible to apply for childcare assistance during class hours through the Ohio Department of Jobs and Family Services. The Kite Learning Center's English courses coincide with the Learning Center calendar, running from September to May.\n\nAll courses are free of charge.",
        buttons: [{ label: "Register for English class", href: ESL_SIGNUP }],
      },
      {
        kind: "cards",
        items: [
          { title: "Women's Level 1 English Class", body: "Monday through Friday, 9 AM to 12 PM\nLocation: 5100 Dierker Rd.\nContact: Allison on WhatsApp at 740-963-2970" },
          { title: "Women's Intermediate English Class", body: "Monday, Tuesday, Wednesday, 12 PM to 3 PM\nLocation: 5100 Dierker Rd.\nContact: Allison on WhatsApp at 740-963-2970" },
          { title: "Women's Citizenship Class", body: "Thursdays, 12 PM to 3 PM\nLocation: 5100 Dierker Rd.\nContact: Lynn on WhatsApp at 614-313-8131" },
          { title: "Men's Intermediate English Class", body: "Watch this space for more information." },
        ],
      },
      {
        kind: "text",
        body: "If you have additional questions, email our ESL program coordinator at thekiteESL@gmail.com.",
        buttons: [{ label: "Register for English class", href: ESL_SIGNUP }],
      },
    ],
  },
  {
    slug: "ece-training",
    title: "Early Childhood Education Training",
    description: "Hands-on early childhood education training at The KITE.",
    sections: [
      {
        kind: "text",
        title: "Training Teachers in Early Childhood Education",
        image: "cff5537c",
        body: "Get hands-on training in Early Childhood Education (ECE) by working with The KITE!\n\nIf you are enrolled in a university program, college course, or simply looking to get practical training in ECE, The Kite Learning Center offers you a place to gain experience that will help you as you further your education.\n\nIf you have additional questions, email our ECE program coordinator at thekiteESL@gmail.com.",
        buttons: [{ label: "Register for ECE training", href: ECE_SIGNUP }],
      },
    ],
  },
  {
    slug: "photos",
    title: "Photos",
    description: "Photos from The KITE Learning Center.",
    sections: [
      {
        kind: "gallery",
        title: "Photos",
        images: [
          "423ce123", "2f58b87d", "2ae8f874", "25beba45", "b283a649", "07aa86f6", "15b7ddbc", "50e6d0fe", "7b9899f7", "054bf22b",
          "1bcbcb9b", "92a22e93", "2ee78f3e", "13881d21", "bf729cd2", "9a12f33f", "bb0106b2", "d172028c", "23e82502",
        ],
      },
    ],
  },
  {
    slug: "values",
    title: "Vision & Values",
    description: "The vision, mission and values of The KITE Learning Center.",
    sections: [
      { kind: "text", title: "Our Vision", body: "To see New American families in the Columbus area integrated and thriving in their communities." },
      {
        kind: "text",
        title: "Our Mission",
        image: "ab7b5b58",
        body: "The KITE Learning Center is a non-profit organization that exists to provide inclusive and equitable resources and opportunities for learning to New American families living in Columbus, Ohio through a play-enriched, special needs supportive training preschool.",
      },
      {
        kind: "list",
        title: "Our Values",
        items: [
          "Inclusivity of different cultures, languages, and abilities",
          "Play-enriched environment with easy accessibility to the outdoors",
          "Hands-on training and mentoring in early childhood education",
          "Mental health and special needs support for staff and families",
          "Physical, mental, and emotional safety",
          "Family and community engagement",
          "Transparency in the interests of reproducibility",
        ],
      },
      { kind: "contact", title: "Connect With Us!", text: "Contact: Lori Wilson" },
    ],
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    description: "Answers and reading about play, risk, trauma-informed care and more.",
    sections: [
      {
        kind: "tiles",
        title: "Frequently Asked Questions",
        items: [
          { image: "bcc56208", caption: "What are the policies on advancing access to childcare for immigrants?", href: "https://www.upwardlyglobal.org/news/news/how-to-advance-immigrant-womens-access-to-childcare-policy-brief/" },
          { image: "3f096630", caption: "Why is risk taking so important for child development?", href: "https://www.communityplaythings.co.uk/learning-library/articles/remove-the-bubble-wrap" },
          { image: "60de3097", caption: "Why is it important for children to play outdoors?", href: "https://www.naeyc.org/resources/pubs/yc/may2019/outdoor-play-is-essential" },
          { image: "cff5537c", caption: "What is trauma-informed care?", href: "https://www.childtrends.org/publications/5-ways-trauma-informed-care-supports-childrens-development" },
          { image: "96597301", caption: "What is child-led play?", href: "https://www.communityplaythings.co.uk/learning-library/articles/what-is-open-ended-play" },
          { image: "219c484b", caption: "How can I help my child with special needs?", href: "https://ohioearlyintervention.org/" },
        ],
      },
    ],
  },
  {
    slug: "get-involved",
    title: "Ways to Support",
    description: "Volunteer, pray, give and help The KITE Learning Center.",
    sections: [
      {
        kind: "cards",
        title: "Volunteer",
        intro: "Jump into our community",
        image: "76a13d39",
        items: [
          { title: "KITE Nights", body: "Join us for our special KITE Night events, where we engage with parents about topics of interest to them and their children's educational needs." },
          { title: "Community Days", body: "Join us for an afternoon together where we fly kites, enjoy ethnic food, and get to know the KITE families on a casual basis." },
          { title: "Fun Fridays", body: "Engage the children in their learning space by presenting your field of experience in a playful way." },
        ],
      },
      {
        kind: "cards",
        title: "Pray",
        intro: "Join us in uplifting this community",
        image: "ab7b5b58",
        items: [
          { title: "The School", body: "For our ability to serve the families in the communities. This includes building relationships, bridging cultural challenges, and aiding families in the documentation required to enroll in childcare." },
          { title: "Funding", body: "For families to get free childcare. This comes about in multiple ways: generous sponsorships, fundraiser participation, and state funding. Please pray for diligence and patience through the state funding process, which requires extensive diligence and paperwork." },
          { title: "The Families", body: "We hope to have 24 students enrolled in the KITE, each with individual families with unique needs. Pray that we may meet them where they are, bridge the language barrier, and let them feel our love for them." },
          { title: "Additional Programming", body: "Setting up the KITE is only the beginning: getting to know these families helps you understand the additional needs they're experiencing. We've introduced additional programs to begin supporting those needs. Mainly, an ESL program for the moms (in need of teachers) and Drivers Ed (in need of instructors)." },
        ],
      },
      {
        kind: "cards",
        title: "Give",
        intro: "Support us in our mission",
        image: "fd6212a1",
        items: [
          { title: "Donate", body: "Donations — no matter how big or small, recurring or not, right now or a bit later — are deeply appreciated.", button: { label: "Donate now", href: DONATE } },
          { title: "Fundraising Events", body: "Make sure you're on our e-mailing list to get notified of our community fundraising opportunities and other ways to support.", button: { label: "Subscribe for updates", href: "mailto:thekitelc@gmail.com?subject=Please%20add%20me%20to%20the%20KITE%20mailing%20list" } },
          { title: "Material Needs", body: "We are accepting winter gloves, hats, balaclava, jackets, snow pants, boots, and socks for children aged 3 through 6. Summer hats, kids' sunglasses, raincoats, and indoor slippers for boys and girls aged 2.5 through 6. You can also visit our Amazon Wishlist.", button: { label: "Amazon wishlist", href: "https://a.co/05i2RCv6" } },
          { title: "Kroger Community Rewards", body: "On your desktop computer, go to kroger.com, go to your profile dropdown and select \"My Account.\" Then hit \"community rewards\" and search for The Kite Learning Center, either by name or code CK070. Click \"Enroll\" and you're all set." },
        ],
      },
      { kind: "contact", title: "Contact us!" },
    ],
  },
  {
    slug: "donate",
    title: "Donate",
    description: "Donate to The KITE Learning Center.",
    sections: [
      {
        kind: "text",
        title: "Donate to The KITE Learning Center",
        image: "74dfb2db",
        body: "Make a donation online by clicking the button below.\n\nOr, make checks payable to:\nThe KITE Learning Center\n6993 Pine Hollow Dr.\nWesterville, OH 43082",
        buttons: [{ label: "Donate now", href: DONATE }],
      },
    ],
  },
  {
    slug: "upcomingevents",
    title: "Upcoming Events",
    description: "Upcoming events at The KITE Learning Center.",
    sections: [{ kind: "text", title: "Upcoming Events", body: "No events at the moment." }],
  },
  {
    slug: "core-beliefs",
    title: "Our Core Beliefs",
    description: "What we believe about children, and how that shapes The KITE.",
    sections: [
      {
        kind: "list",
        title: "We believe children...",
        items: [
          "are innately curious and intrinsically motivated to learn",
          "thrive when given agency",
          "need to be prepared for real life through real-life experiences",
          "are uniquely gifted and want to be useful in their community",
          "need to feel like they belong",
          "deserve equitable resources for different needs",
          "need to feel seen, soothed, safe & secure to build resilience",
          "who are dual language learners must keep learning their first language",
          "learn best when they feel safe, loved & are challenged",
        ],
      },
      { kind: "gallery", images: ["19f9ad1d", "02566747"] },
      {
        kind: "list",
        title: "At the KITE Learning Center...",
        items: [
          "We move, sing, create, observe, discuss, and read while playing mostly outdoors because we believe it reduces stress, helps us to self-regulate, and that nature can teach us so much.",
          "The family & community is essential to success and therefore we strive to honor the home cultures and languages of our families and create many spaces to connect within the community.",
          "Creating a safe place is our priority, but we will encourage risky play because we believe that children need a level of risk in order for their brains to fully develop.",
          "The Kite environment needs to be: culturally relatable, language enriched, inviting, inclusive, respectful and calming.",
          "We offer a child-led approach to learning that values connectedness, transparency, simplicity, respect & joy in learning.",
          "Our staff are a community of diverse learning collaborators committed to providing a safe and loving learning environment.",
        ],
      },
    ],
  },
  {
    slug: "preschoolteam",
    title: "Preschool Team",
    description: "Meet the preschool team at The KITE Learning Center.",
    sections: [
      {
        kind: "people",
        title: "Our Team",
        items: [
          { name: "Lynn Sieberhagen", role: "Administrator", image: "933d6f0f" },
          { name: "Shoroug Samara", role: "Learning Facilitator", image: "7a4df006" },
          { name: "Lori Wilson", role: "Learning Facilitator", image: "97435713" },
          { name: "Yamina Bellal", role: "Learning Facilitator", image: "15a86821" },
        ],
      },
    ],
  },
  {
    slug: "our-board",
    title: "Board of Directors",
    description: "The Board of Directors of The KITE Learning Center.",
    sections: [
      {
        kind: "people",
        title: "Board of Directors",
        items: [
          { name: "Lynn Sieberhagen", image: "134d1ecf", bio: "Lynn Sieberhagen graduated from the University of Witwatersrand, South Africa, with a Bachelor's in Psychology and Education, and post-graduate study in Geography. She has been teaching preschool, elementary, high school, and adults for the past 32 years in South Africa, Uzbekistan, Kazakhstan, and the USA, including a year of homeschooling, directing a preschool, and private tutoring in Math and English as a second language.\n\nShe speaks 3 languages and has an appreciation for what it's like to be a foreigner in a country. She directed the preschool teacher training department of a non-profit in South Africa for 4 years as well as the training department of a non-profit in Kazakhstan for 4 years and has volunteered in several public and private preschools and elementary schools in Columbus for the past 4 years. She has a passion for seeing educators thrive in their occupation and New American families receive quality educational opportunities and resources." },
          { name: "Caleb Stertzer", image: "407da1bc", bio: "Caleb Stertzer has been a financial advisor with Central Ohio Financial Management Group in Worthington, Ohio since 2011. Before working with COFMG, Caleb worked with Ameriprise Financial as a paraplanner. Caleb grew up in central Ohio and attended Worthington Christian School from K-12. He then majored in Finance and graduated from Taylor University in 2010. Caleb currently lives in Westerville with his wife, Rachel, and their 3 kids – Zac, Dan, and Gabby." },
          { name: "Chrissy Nettekoven", image: "6d719b42", bio: "Chrissy Nettekoven Spears Graduated from California University of Pennsylvania with a master's degree in Rehabilitation and Exercise Science. She worked in outpatient physical therapy settings and injury prevention programs for athletes. Additionally, she has coached soccer for both youth and collegiate teams. Most recently she has helped to grow the exposure of Xcopri, a new medication for epilepsy, by sharing her story in various capacities and working with the pharmaceutical company. Her recent volunteer experience has been as a small group facilitator, an Afghan Asylum Taskforce volunteer, and a volunteer in various capacities at her church.\n\nOne of Chrissy's greatest desires is to make all people feel seen, heard, and valued." },
          { name: "Melanie Trombetti", image: "365faacb", bio: "Melanie Trombetti is a graduate of The Ohio State University with a Bachelor's Degree in Education. She is finishing her 21st year as an educator after taking several years off to raise her children. She currently works as an Intervention Aide in an Intellectual Delay classroom in the Olentangy Local School District.\n\nMelanie lives in Lewis Center with her husband of 36 years, Joe. They have three grown children, two sons-in-law, and one granddaughter." },
          { name: "Laura Liston", image: "b5cdba78", bio: "Laura Liston has invested her life in the education of elementary children in secular and Christian schools, and in churches. She holds a degree in Education and an Ohio Teaching License. She desires to see children thrive and grow both academically and socially. Her passion is literacy and teaching children to read. She is a mother of four and grandmother of six. She and her husband live in Worthington and have been active members at Heritage Christian Church since 2006." },
          { name: "Jenn Peddicord", image: "2d76739c", bio: "Jenn Peddicord, LPC has a Master's degree in Clinical Mental Health Counseling from Ashland Theological Seminary. She also holds a Bachelor's in Social Work from The Ohio State University. Before her career in a therapeutic setting, Jenn spent 7 years working with kids who were navigating the autism spectrum, developmental challenges, ADHD, and ODD. It is a passion of hers to create spaces of inclusivity where kids can learn in the ways that suit them. Jenn is motivated to help provide tools for kids and teachers to help support their mental health and grow their emotional regulation skills whether that be through movement, sensory input, or co-regulation with teachers or peers." },
        ],
      },
    ],
  },
  {
    slug: "contactus",
    title: "Contact Us",
    description: "Phone, email, address and office hours for The KITE Learning Center.",
    sections: [
      { kind: "hero", image: "51cf3837", title: "Contact Us", text: "Let's chat! Call, text or email and we'll be in touch." },
      { kind: "contact", title: "Contact Us" },
    ],
  },
];

// The menu, grouped like the Wix site's.
export const MENU: { label: string; links: { label: string; slug: string }[] }[] = [
  { label: "Classes", links: [
    { label: "Preschool", slug: "preschool" },
    { label: "Adult English Classes", slug: "adultenglishclasses" },
    { label: "Early Childhood Education Training", slug: "ece-training" },
  ] },
  { label: "Resources", links: [
    { label: "Photos", slug: "photos" },
    { label: "Vision & Values", slug: "values" },
    { label: "Frequently Asked Questions", slug: "faq" },
  ] },
  { label: "Get Involved", links: [
    { label: "Ways to Support", slug: "get-involved" },
    { label: "Donate", slug: "donate" },
    { label: "Upcoming Events", slug: "upcomingevents" },
  ] },
  { label: "About Us", links: [
    { label: "Our Core Beliefs", slug: "core-beliefs" },
    { label: "Preschool Team", slug: "preschoolteam" },
    { label: "Board of Directors", slug: "our-board" },
    { label: "Contact Us", slug: "contactus" },
  ] },
];

export const OFFICE_HOURS = "Monday, Wednesday, Friday from 12:00 PM to 3:00 PM";

export const pageFor = (slug: string) => PAGES.find((p) => p.slug === slug);
