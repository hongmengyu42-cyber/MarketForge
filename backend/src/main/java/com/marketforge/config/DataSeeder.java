package com.marketforge.config;

import com.marketforge.entity.*;
import com.marketforge.entity.FinancialLedgerAccount.AccountType;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final FinancialLedgerAccountRepository ledgerAccountRepo;
    private final CategoryRepository categoryRepo;
    private final SkillRepository skillRepo;
    private final UserRepository userRepo;
    private final SellerProfileRepository sellerProfileRepo;
    private final ListingRepository listingRepo;
    private final JobPostRepository jobPostRepo;
    private final SkillAssessmentRepository assessmentRepo;
    private final UserSkillBadgeRepository badgeRepo;
    private final PortfolioItemRepository portfolioRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        seedLedgerAccounts();
        seedCategories();
        seedSkills();
        seedAdminUser();
        seedSampleListings();
        seedSampleJobs();
        seedSkillAssessments();
        seedSamplePortfolios();
        log.info("✅ Data seeding completed");
    }

    private void seedLedgerAccounts() {
        if (ledgerAccountRepo.count() > 0) return;
        log.info("Seeding ledger accounts...");
        ledgerAccountRepo.save(FinancialLedgerAccount.builder().code("1010_ESCROW_HOLDING").name("Escrow Holding").type(AccountType.ASSET).build());
        ledgerAccountRepo.save(FinancialLedgerAccount.builder().code("1020_BANK_SETTLEMENT").name("Bank Settlement").type(AccountType.ASSET).build());
        ledgerAccountRepo.save(FinancialLedgerAccount.builder().code("2010_SELLER_PAYOUTS_PENDING").name("Seller Payouts Pending").type(AccountType.LIABILITY).build());
        ledgerAccountRepo.save(FinancialLedgerAccount.builder().code("4010_PLATFORM_REVENUE").name("Platform Revenue").type(AccountType.REVENUE).build());
        ledgerAccountRepo.save(FinancialLedgerAccount.builder().code("5010_BUYER_REFUND_EXPENSE").name("Buyer Refund Expense").type(AccountType.EXPENSE).build());
    }

    private void seedCategories() {
        if (categoryRepo.count() > 0) return;
        log.info("Seeding categories...");
        String[][] cats = {
                {"Web Development", "web-development"},
                {"Mobile Development", "mobile-development"},
                {"Design & Creative", "design-creative"},
                {"Writing & Translation", "writing-translation"},
                {"Digital Marketing", "digital-marketing"},
                {"Video & Animation", "video-animation"},
                {"Music & Audio", "music-audio"},
                {"Data & AI", "data-ai"}
        };
        for (String[] c : cats) {
            categoryRepo.save(Category.builder().name(c[0]).slug(c[1]).build());
        }
    }

    private void seedSkills() {
        if (skillRepo.count() > 0) return;
        log.info("Seeding skills...");
        String[][] skills = {
                {"JavaScript", "javascript"}, {"TypeScript", "typescript"}, {"React", "react"},
                {"Vue", "vue"}, {"Angular", "angular"}, {"Node.js", "nodejs"},
                {"Python", "python"}, {"Java", "java"}, {"PHP", "php"},
                {"Laravel", "laravel"}, {"Swift", "swift"}, {"Kotlin", "kotlin"},
                {"Figma", "figma"}, {"Photoshop", "photoshop"}, {"CSS", "css"},
                {"SQL", "sql"}, {"Docker", "docker"}, {"AWS", "aws"}
        };
        for (String[] s : skills) {
            skillRepo.save(Skill.builder().name(s[0]).slug(s[1]).build());
        }
    }

    private void seedAdminUser() {
        if (!userRepo.existsByEmail("admin@marketforge.com")) {
            log.info("Seeding admin user...");
            userRepo.save(User.builder()
                    .name("Admin")
                    .email("admin@marketforge.com")
                    .password(passwordEncoder.encode("admin123"))
                    .isAdmin(true)
                    .build());
        }

        // Ensure owner email is always assigned Admin role
        userRepo.findByEmail("hongmengyu42@gmail.com").ifPresent(user -> {
            if (!Boolean.TRUE.equals(user.getIsAdmin())) {
                user.setIsAdmin(true);
                userRepo.save(user);
                log.info("Promoted hongmengyu42@gmail.com to Admin");
            }
        });
    }

    private void seedSampleListings() {
        if (listingRepo.count() > 0) return;
        log.info("Seeding sample sellers and listings...");

        // Seller 1: Alex Morgan
        User alex = userRepo.findByEmail("alex@marketforge.com").orElseGet(() ->
            userRepo.save(User.builder()
                .name("Alex Morgan")
                .email("alex@marketforge.com")
                .password(passwordEncoder.encode("alex123"))
                .isAdmin(false)
                .build()));
        SellerProfile spAlex = sellerProfileRepo.findByUserId(alex.getId()).orElseGet(() ->
            sellerProfileRepo.save(SellerProfile.builder()
                .user(alex)
                .displayName("Alex Morgan")
                .bio("Senior Full-Stack Engineer with 8+ years experience in React, Spring Boot, and cloud architecture.")
                .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80")
                .onboardingStatus("active")
                .averageRating(5.0)
                .reviewCount(14)
                .completedOrdersCount(18)
                .hourlyRate(7500)
                .build()));

        // Seller 2: Sarah Chen
        User sarah = userRepo.findByEmail("sarah@marketforge.com").orElseGet(() ->
            userRepo.save(User.builder()
                .name("Sarah Chen")
                .email("sarah@marketforge.com")
                .password(passwordEncoder.encode("sarah123"))
                .isAdmin(false)
                .build()));
        SellerProfile spSarah = sellerProfileRepo.findByUserId(sarah.getId()).orElseGet(() ->
            sellerProfileRepo.save(SellerProfile.builder()
                .user(sarah)
                .displayName("Sarah Chen")
                .bio("Mobile App Specialist crafting beautiful, performant iOS and Android applications.")
                .avatarUrl("https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80")
                .onboardingStatus("active")
                .averageRating(4.9)
                .reviewCount(21)
                .completedOrdersCount(27)
                .hourlyRate(8500)
                .build()));

        // Seller 3: Marcus Vance
        User marcus = userRepo.findByEmail("marcus@marketforge.com").orElseGet(() ->
            userRepo.save(User.builder()
                .name("Marcus Vance")
                .email("marcus@marketforge.com")
                .password(passwordEncoder.encode("marcus123"))
                .isAdmin(false)
                .build()));
        SellerProfile spMarcus = sellerProfileRepo.findByUserId(marcus.getId()).orElseGet(() ->
            sellerProfileRepo.save(SellerProfile.builder()
                .user(marcus)
                .displayName("Marcus Vance")
                .bio("Lead Product Designer & Design Systems Architect creating modern digital experiences.")
                .avatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80")
                .onboardingStatus("active")
                .averageRating(5.0)
                .reviewCount(32)
                .completedOrdersCount(45)
                .hourlyRate(6000)
                .build()));

        // Seller 4: Elena Rostova
        User elena = userRepo.findByEmail("elena@marketforge.com").orElseGet(() ->
            userRepo.save(User.builder()
                .name("Elena Rostova")
                .email("elena@marketforge.com")
                .password(passwordEncoder.encode("elena123"))
                .isAdmin(false)
                .build()));
        SellerProfile spElena = sellerProfileRepo.findByUserId(elena.getId()).orElseGet(() ->
            sellerProfileRepo.save(SellerProfile.builder()
                .user(elena)
                .displayName("Elena Rostova")
                .bio("Data Scientist & Machine Learning Engineer delivering scalable AI systems.")
                .avatarUrl("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80")
                .onboardingStatus("active")
                .averageRating(4.8)
                .reviewCount(12)
                .completedOrdersCount(15)
                .hourlyRate(9000)
                .build()));

        // Lookup Categories
        Category webDev = categoryRepo.findBySlug("web-development").orElse(null);
        Category mobileDev = categoryRepo.findBySlug("mobile-development").orElse(null);
        Category design = categoryRepo.findBySlug("design-creative").orElse(null);
        Category dataAi = categoryRepo.findBySlug("data-ai").orElse(null);

        // Lookup Skills
        List<Skill> reactSkills = skillRepo.findAllById(List.of(1L, 2L, 3L)); // JS, TS, React
        List<Skill> mobileSkills = skillRepo.findAllById(List.of(11L, 12L)); // Swift, Kotlin
        List<Skill> designSkills = skillRepo.findAllById(List.of(13L, 14L, 15L)); // Figma, Photoshop, CSS
        List<Skill> aiSkills = skillRepo.findAllById(List.of(7L, 16L, 17L, 18L)); // Python, SQL, Docker, AWS

        // Listing 1
        createSampleListing(spAlex, webDev,
                "Full-Stack Web Application with React, TypeScript & Spring Boot",
                "full-stack-web-application-react-typescript-spring-boot",
                "I will architect, design, and build a complete enterprise web application with React 18, TypeScript, Tailwind CSS, and a robust Spring Boot 3 REST API backend backed by MySQL. Includes JWT authentication, responsive layout, and unit tests.",
                15000L, 3, 3, 5.0, 14, 18, reactSkills,
                "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80");

        // Listing 2
        createSampleListing(spSarah, mobileDev,
                "Cross-Platform Mobile App for iOS and Android in Flutter",
                "cross-platform-mobile-app-ios-and-android",
                "I will build high-performance, native-feel iOS and Android mobile applications. Clean architecture, offline caching, push notifications, and store deployment readiness guaranteed.",
                22000L, 5, 2, 4.9, 21, 27, mobileSkills,
                "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80");

        // Listing 3
        createSampleListing(spMarcus, design,
                "Modern SaaS Brand Identity, UI/UX Design & Design System",
                "modern-saas-brand-identity-ui-ux-design",
                "Pixel-perfect Figma designs for your web or mobile app. Includes high-fidelity prototypes, user journey flows, typography and color palettes, and production-ready component libraries.",
                12000L, 2, 5, 5.0, 32, 45, designSkills,
                "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80");

        // Listing 4
        createSampleListing(spElena, dataAi,
                "Production Machine Learning Pipeline & Data Analytics Dashboard",
                "production-machine-learning-pipeline-data-analytics",
                "End-to-end data pipelines, custom ML models, automated feature engineering, and real-time visualization dashboards using Python, Docker, and cloud infrastructure.",
                28000L, 4, 2, 4.8, 12, 15, aiSkills,
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80");

        // Listing 5
        createSampleListing(spAlex, webDev,
                "High-Performance REST APIs & Microservices Architecture",
                "high-performance-rest-apis-microservices-architecture",
                "Scalable backend microservices and RESTful API endpoints engineered with Spring Boot 3, Spring Security, Hibernate ORM, and Docker containerization.",
                19500L, 3, 2, 5.0, 8, 10, aiSkills,
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80");

        // Listing 6
        createSampleListing(spMarcus, design,
                "Modern Responsive Landing Page with Tailwind CSS & Next.js",
                "modern-responsive-landing-page-tailwind-nextjs",
                "Stunning landing pages built to convert visitors. Fast loading, fully accessible, and optimized for SEO and all screen sizes.",
                8500L, 2, 3, 4.9, 15, 20, designSkills,
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80");
    }

    private void createSampleListing(SellerProfile sp, Category cat, String title, String slug,
                                     String desc, Long priceCents, int days, int revisions,
                                     Double rating, int reviews, int orders, List<Skill> skills, String imageUrl) {
        if (cat == null) return;
        Listing l = Listing.builder()
                .sellerProfile(sp)
                .category(cat)
                .title(title)
                .slug(slug)
                .description(desc)
                .priceAmount(priceCents)
                .currency("usd")
                .deliveryDays(days)
                .revisionsIncluded(revisions)
                .status(Listing.ListingStatus.ACTIVE)
                .averageRating(rating)
                .reviewCount(reviews)
                .completedOrdersCount(orders)
                .viewCount(reviews * 12 + 50)
                .skills(skills)
                .build();

        l = listingRepo.save(l);

        ListingImage img = ListingImage.builder()
                .listing(l)
                .imageUrl(imageUrl)
                .isPrimary(true)
                .displayOrder(0)
                .build();

        l.setImages(new ArrayList<>(List.of(img)));
        listingRepo.save(l);
    }

    private void seedSampleJobs() {
        if (jobPostRepo.count() > 0) return;
        log.info("Seeding sample client job posts...");

        User admin = userRepo.findByEmail("admin@marketforge.com").orElse(null);
        if (admin == null) return;

        Category webDev = categoryRepo.findBySlug("web-development").orElse(null);
        Category mobileDev = categoryRepo.findBySlug("mobile-development").orElse(null);
        Category design = categoryRepo.findBySlug("design-creative").orElse(null);
        Category dataAi = categoryRepo.findBySlug("data-ai").orElse(null);

        jobPostRepo.save(JobPost.builder()
                .title("Full-Stack AI Resume & Portfolio Builder with Next.js & Spring Boot")
                .slug("full-stack-ai-resume-builder-" + System.currentTimeMillis() % 10000)
                .description("Looking for an experienced full-stack engineer to build a high-converting AI resume and portfolio builder web application. The platform requires customizable resume templates, real-time PDF generation, AI bullet-point enhancer using OpenAI/Gemini APIs, and payment integration with Stripe.\n\nDeliverables:\n- Responsive frontend built with React/Next.js and Tailwind CSS\n- Robust backend REST API with Spring Boot\n- OpenAI prompt integration for intelligent suggestions\n- PDF export service\n- Clean documentation and deployment guide.")
                .client(admin)
                .category(webDev)
                .budgetType("FIXED_PRICE")
                .budgetAmount(120000L) // $1,200.00
                .experienceLevel("EXPERT")
                .duration("1 to 3 months")
                .status("OPEN")
                .skills("React, Next.js, Spring Boot, OpenAI API, Tailwind CSS, TypeScript")
                .proposalsCount(0)
                .build());

        jobPostRepo.save(JobPost.builder()
                .title("Cross-Platform Flutter App for Local On-Demand Courier Tracking")
                .slug("flutter-courier-tracking-app-" + (System.currentTimeMillis() + 1) % 10000)
                .description("We require a cross-platform mobile application (iOS & Android) built with Flutter for live order tracking, courier dispatch, and customer notifications. The app must integrate Google Maps SDK for real-time driver navigation and Firebase Cloud Messaging for instant push notifications.\n\nKey Requirements:\n- Interactive map with live courier location updates\n- Order status workflow (Assigned, Picked Up, In Transit, Delivered)\n- Client signature capture on delivery\n- Firebase authentication and push notifications.")
                .client(admin)
                .category(mobileDev)
                .budgetType("FIXED_PRICE")
                .budgetAmount(85000L) // $850.00
                .experienceLevel("INTERMEDIATE")
                .duration("Less than 1 month")
                .status("OPEN")
                .skills("Flutter, Dart, Firebase, Google Maps API, Mobile App Development")
                .proposalsCount(0)
                .build());

        jobPostRepo.save(JobPost.builder()
                .title("Complete Brand Identity Design System & Pitch Deck for Fintech Startup")
                .slug("fintech-brand-identity-pitch-deck-" + (System.currentTimeMillis() + 2) % 10000)
                .description("We are preparing for our Seed funding round and need a top-tier visual designer to craft a modern, trustworthy brand identity system. This project includes logo design, color palette, typography guidelines, vector icon pack, and a 15-slide investor pitch deck in Figma and Google Slides.\n\nDeliverables:\n- Primary & secondary logo variations with vector source files (.SVG, .AI)\n- Complete Brand Style Guide (PDF & Figma)\n- Investor Pitch Deck template (Figma + 16:9 Google Slides)\n- Social media branding kit.")
                .client(admin)
                .category(design)
                .budgetType("FIXED_PRICE")
                .budgetAmount(60000L) // $600.00
                .experienceLevel("INTERMEDIATE")
                .duration("Less than 1 month")
                .status("OPEN")
                .skills("Figma, Brand Guidelines, UI/UX, Typography, Pitch Decks, Graphic Design")
                .proposalsCount(0)
                .build());

        jobPostRepo.save(JobPost.builder()
                .title("Automated Python Web Scraping & Data Pipeline for Real Estate Analytics")
                .slug("python-real-estate-scraper-" + (System.currentTimeMillis() + 3) % 10000)
                .description("We need an automated, fault-tolerant Python data pipeline to extract public property listings and commercial lease rates across 5 regional portals daily. The pipeline must handle rotating proxies, clean raw HTML into structured JSON, and store records into a PostgreSQL database with automated change detection.\n\nDeliverables:\n- Clean, documented Python scripts using Playwright / BeautifulSoup\n- Daily scheduled cron or GitHub Actions workflow\n- PostgreSQL database schema and automated deduplication\n- CSV / Excel weekly summary exports.")
                .client(admin)
                .category(dataAi)
                .budgetType("HOURLY")
                .budgetAmount(4500L) // $45.00 / hour
                .budgetMax(6500L) // up to $65.00 / hour
                .experienceLevel("INTERMEDIATE")
                .duration("1 to 3 months")
                .status("OPEN")
                .skills("Python, Web Scraping, PostgreSQL, BeautifulSoup, Pandas, Docker")
                .proposalsCount(0)
                .build());
    }

    private void seedSkillAssessments() {
        if (assessmentRepo.count() > 0) return;
        log.info("Seeding skill assessments...");

        Skill reactSkill = skillRepo.findBySlug("react").orElse(null);
        Skill javaSkill = skillRepo.findBySlug("java").orElse(null);
        Skill figmaSkill = skillRepo.findBySlug("figma").orElse(null);

        // 1. React & Next.js Pro
        String reactQuestions = "[" +
                "{\"id\":1,\"question\":\"What is the primary motivation for using the useCallback hook in React?\",\"options\":[\"To prevent unnecessary re-creations of callback functions passed to memoized children\",\"To automatically execute asynchronous code before render\",\"To replace Redux state in entire component tree\",\"To memoize computationally expensive primitive numbers\"],\"correctIndex\":0}," +
                "{\"id\":2,\"question\":\"In React 18, how does automatic batching improve rendering performance?\",\"options\":[\"Groups multiple state updates inside promises, timeouts, and event handlers into a single re-render\",\"Compiles JSX into WebAssembly bytecode ahead of time\",\"Disables the component tree diffing completely\",\"Renders components synchronously on the main thread\"],\"correctIndex\":0}," +
                "{\"id\":3,\"question\":\"What distinguishes React Server Components (RSC) from Client Components in Next.js?\",\"options\":[\"Server components execute strictly on the server and send zero JavaScript to the client bundle\",\"Server components cannot import CSS styles\",\"Client components cannot receive props from server components\",\"Server components have direct access to useState and browser DOM events\"],\"correctIndex\":0}," +
                "{\"id\":4,\"question\":\"When is it recommended to use the useMemo hook?\",\"options\":[\"When a calculation is computationally heavy and its dependencies rarely change\",\"When setting document titles and timers\",\"Whenever creating any local variable in a component\",\"To force child components to re-mount every cycle\"],\"correctIndex\":0}," +
                "{\"id\":5,\"question\":\"What is the critical role of the key prop when rendering dynamic arrays in React?\",\"options\":[\"Helps React identify which items have changed, been added, or been removed during reconciliation\",\"Generates encrypted CSS class names for styling\",\"Defines the tab order for keyboard navigation accessibility\",\"Acts as an immutable database primary key in the backend\"],\"correctIndex\":0}" +
                "]";

        SkillAssessment reactAssessment = assessmentRepo.save(SkillAssessment.builder()
                .title("React & Next.js Professional Assessment")
                .description("Demonstrate your mastery in React 18 architecture, hooks, Server Components, and high-performance state management.")
                .skill(reactSkill)
                .passingScore(80)
                .timeLimitMinutes(15)
                .questions(reactQuestions)
                .build());

        // 2. Spring Boot & Java Enterprise
        String springQuestions = "[" +
                "{\"id\":1,\"question\":\"What does the @Transactional annotation in Spring Boot manage automatically?\",\"options\":[\"Begins, commits, or rolls back database transactions based on runtime exceptions\",\"Encrypts all HTTP request bodies with AES-256\",\"Converts relational tables into NoSQL documents\",\"Creates an asynchronous thread pool for every method invocation\"],\"correctIndex\":0}," +
                "{\"id\":2,\"question\":\"How does Spring Boot resolve Bean dependency injection by default?\",\"options\":[\"Singleton scope through constructor, setter, or field injection in ApplicationContext\",\"Prototype scope where a new object is created on every access\",\"ThreadLocal scope isolated to HTTP request threads only\",\"Static class instantiation on JVM class loading\"],\"correctIndex\":0}," +
                "{\"id\":3,\"question\":\"What is the N+1 select problem in Spring Data JPA and how is it typically solved?\",\"options\":[\"Executing 1 query for parents followed by N queries for children; solved with @EntityGraph or JOIN FETCH\",\"Inserting N+1 rows simultaneously causing database lock contention\",\"Having more than N entity classes in the classpath\",\"Exceeding database connection pool timeout threshold\"],\"correctIndex\":0}," +
                "{\"id\":4,\"question\":\"Which HTTP status code is standard when an unauthenticated request reaches Spring Security?\",\"options\":[\"401 Unauthorized\",\"403 Forbidden\",\"404 Not Found\",\"422 Unprocessable Entity\"],\"correctIndex\":0}," +
                "{\"id\":5,\"question\":\"What is the primary benefit of using Spring Boot Starters?\",\"options\":[\"Aggregates curated, compatible dependency sets and enables autoconfiguration\",\"Pre-compiles Java bytecode into native machine code\",\"Automatically generates frontend React components\",\"Restricts database queries to read-only mode in production\"],\"correctIndex\":0}" +
                "]";

        SkillAssessment springAssessment = assessmentRepo.save(SkillAssessment.builder()
                .title("Spring Boot & Java Enterprise Architecture")
                .description("Validate your expertise in Spring Boot 3, REST API design, JPA transactions, and enterprise microservices security.")
                .skill(javaSkill)
                .passingScore(80)
                .timeLimitMinutes(15)
                .questions(springQuestions)
                .build());

        // 3. UI/UX Design & Figma
        String figmaQuestions = "[" +
                "{\"id\":1,\"question\":\"What is the WCAG AA minimum color contrast ratio requirement for normal body text?\",\"options\":[\"4.5:1\",\"3.0:1\",\"7.0:1\",\"2.0:1\"],\"correctIndex\":0}," +
                "{\"id\":2,\"question\":\"In Figma, how does Auto Layout with 'Fill Container' behave?\",\"options\":[\"Expands the child layer to stretch to the full width or height of its parent frame\",\"Restricts the child to a fixed pixel width regardless of resizing\",\"Shrinks the child to tightly wrap its inner text contents\",\"Positions the child layer absolutely outside the layout flow\"],\"correctIndex\":0}," +
                "{\"id\":3,\"question\":\"What is the primary objective of a design token in a design system?\",\"options\":[\"Abstract design values (colors, spacing, typography) into agnostic variables synced between design and code\",\"Cryptographically authenticate designers on the platform\",\"Generate vector SVG icons automatically from raster images\",\"Compress image assets for faster web rendering\"],\"correctIndex\":0}," +
                "{\"id\":4,\"question\":\"According to Fitts's Law in UI design, interactive buttons should be:\",\"options\":[\"Adequately sized and placed close to expected cursor or thumb resting zones\",\"As small as possible to conserve screen real estate\",\"Hidden behind nested accordion menus until explicitly searched\",\"Placed exclusively at the extreme top corners of the screen\"],\"correctIndex\":0}," +
                "{\"id\":5,\"question\":\"What is the main advantage of creating reusable Figma Component Variants?\",\"options\":[\"Groups related interactive states (hover, active, disabled) into a single master component\",\"Converts Figma layers into production-ready Swift code directly\",\"Prevents other team members from viewing the component properties\",\"Reduces file size by deleting unselected states permanently\"],\"correctIndex\":0}" +
                "]";

        assessmentRepo.save(SkillAssessment.builder()
                .title("UI/UX Design Systems & Figma Pro")
                .description("Test your design system thinking, accessible typography, Figma auto-layout, and interactive prototyping skills.")
                .skill(figmaSkill)
                .passingScore(80)
                .timeLimitMinutes(15)
                .questions(figmaQuestions)
                .build());

        // Seed verified badge for Alex Morgan
        User alex = userRepo.findByEmail("alex@marketforge.com").orElse(null);
        if (alex != null) {
            badgeRepo.save(UserSkillBadge.builder()
                    .user(alex)
                    .assessment(reactAssessment)
                    .score(95)
                    .passed(true)
                    .earnedAt(java.time.LocalDateTime.now().minusDays(14))
                    .build());

            badgeRepo.save(UserSkillBadge.builder()
                    .user(alex)
                    .assessment(springAssessment)
                    .score(90)
                    .passed(true)
                    .earnedAt(java.time.LocalDateTime.now().minusDays(10))
                    .build());
        }
    }

    private void seedSamplePortfolios() {
        if (portfolioRepo.count() > 0) return;
        log.info("Seeding sample portfolio case studies...");

        User alex = userRepo.findByEmail("alex@marketforge.com").orElse(null);
        if (alex == null) return;

        portfolioRepo.save(PortfolioItem.builder()
                .user(alex)
                .title("Fintech Escrow & Multi-Currency Digital Wallet")
                .description("Designed and engineered an enterprise-grade digital escrow wallet with real-time settlement, automated 1099 tax handling, and instant card payout integrations via Stripe Connect Express. Handled over $2.5M in staged client milestones with zero reconciliation disputes.")
                .projectUrl("https://marketforge.dev/demo/fintech-wallet")
                .thumbnailUrl("https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80")
                .imageUrls("https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80")
                .skillsUsed("React,TypeScript,Tailwind CSS,Spring Boot,Stripe Connect,MySQL")
                .completionDate("November 2026")
                .build());

        portfolioRepo.save(PortfolioItem.builder()
                .user(alex)
                .title("AI-Powered Telehealth Patient Diagnostic Portal")
                .description("Architected a HIPAA-compliant medical intake dashboard featuring WebRTC encrypted video consultations, real-time doctor scheduling, and automated AI clinical note summarization for over 45,000 active patients.")
                .projectUrl("https://marketforge.dev/demo/telehealth-portal")
                .thumbnailUrl("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80")
                .imageUrls("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1504813184591-01572f98c85f?auto=format&fit=crop&w=800&q=80")
                .skillsUsed("Next.js,React,Spring Security,WebSockets,Tailwind CSS,PostgreSQL")
                .completionDate("September 2026")
                .build());

        portfolioRepo.save(PortfolioItem.builder()
                .user(alex)
                .title("Global SaaS B2B Analytics & Event Ingestion Engine")
                .description("Engineered high-throughput event streaming dashboards processing over 12 million daily behavioral telemetry records with sub-second aggregate query speeds and automated Slack alerting.")
                .projectUrl("https://marketforge.dev/demo/saas-analytics")
                .thumbnailUrl("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80")
                .imageUrls("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80")
                .skillsUsed("React,TypeScript,Docker,Spring Boot,Kafka,Redis")
                .completionDate("July 2026")
                .build());
    }
}
