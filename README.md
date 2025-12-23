# ScholarVault 📚

A comprehensive smart learning platform that combines study notes management, progress analytics, and AI-powered features to help students optimize their learning journey.

## 🎯 Core Features

### Learning Management
- **Smart Notes Management**: PDF viewer with annotation capabilities, powered by AI summaries
- **Subject Organization**: Organize notes by subjects and semesters, with structured learning paths
- **Progress Tracking**: Real-time tracking of completed units with detailed analytics
- **Year-based Learning**: Support for 1st and 2nd year curricula with semester-level organization
- **Bookmark System**: Save important notes and resources for quick access

### Advanced Analytics & Insights
- **Session Tracking**: Automatic capture of study sessions across login/logout and tab lifecycle
- **Per-Note Time Tracking**: Invisible time tracking for individual notes (>5 second threshold)
- **Comprehensive Analytics**: 
  - Weekly & monthly activity trends with hourly breakdowns
  - Subject-level time aggregation showing hours spent per subject
  - Peak study time detection (morning/afternoon/evening/night)
  - 8-week study velocity graph (notes completed per week)
  - Streak tracking with 15-minute daily threshold
  - Revisit counting for completed notes

### User Management
- **Authentication**: Secure JWT-based authentication with email/password
- **Preferences**: Customizable user preferences (notifications, year selection, study goals)
- **Data Export**: Complete user data export in JSON format
- **Profile Management**: Update email, password, and profile information

### Search & Discovery
- **Full-text Search**: Search across all notes with filtering by subject
- **Search Analytics**: Track popular search queries for insights
- **Subject Discovery**: Browse and enroll in available subjects by branch and semester

### File Management
- **Secure File Uploads**: Upload study materials with automatic processing
- **OCR Processing**: Automatic text extraction from PDF documents
- **Smart Organization**: Automatic categorization and indexing

## 🚀 Getting Started

Visit [ScholarVault.app](https://scholarvault.app) to create an account and start optimizing your learning with intelligent analytics.

## 📊 Key Analytics Features

**Session Management**
- Automatic session tracking on login/logout
- Handles complex session scenarios with midnight-spanning sessions
- Accurate daily time attribution

**Per-Note Tracking**
- Invisible background tracking when studying notes
- Records learning duration per note
- Tracks when you revisit completed materials

**Streaks & Consistency**
- Track your study consistency with streak counters
- 15-minute daily study threshold
- Visualize your longest streak and current momentum

**Subject Insights**
- Understand how much time you spend per subject
- Compare your learning intensity across subjects
- Identify subjects needing more attention

**Learning Velocity**
- 8-week trend of completed notes per week
- Track your learning progression over time
- Identify peak learning periods

## 📁 Architecture

ScholarVault is built using modern cloud technologies with enterprise-grade security and scalability. The platform uses:

- Modern React 18 frontend with responsive design
- Node.js backend with REST API
- PostgreSQL database with advanced analytics
- Cloud storage for document management
- AI-powered features for enhanced learning

For detailed technical architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 🔒 Security & Privacy

ScholarVault prioritizes your data security:

- **Secure Authentication**: Industry-standard JWT token-based authentication
- **Password Security**: Advanced hashing algorithms for password protection
- **API Protection**: Rate limiting and CORS protection against abuse
- **Data Privacy**: Your study data is private and encrypted
- **File Security**: Secure upload and storage mechanisms
- **Regular Updates**: Continuous security monitoring and updates

## 📱 User Workflows

**Study Session Workflow**
1. Login to ScholarVault → Session tracking starts automatically
2. Browse and open your study notes
3. Study and take notes → Time tracking runs invisibly in background
4. Mark units as completed when finished
5. Logout → Session ends and analytics are aggregated
6. View Progress page to see all your analytics updated in real-time

**Dashboard Overview**
- Quick stats on total study time, completed units, and current streaks
- Weekly activity visualization
- Personalized peak study time indicator
- Subject progress tracking

## 📈 Analytics Dashboard

The Progress page provides comprehensive insights:

- **Weekly Activity Chart**: Hour-by-hour breakdown of study activity
- **Monthly Trends**: 30-day view of your learning patterns
- **Subject Performance**: Track completion and time spent per subject
- **Study Velocity**: 8-week trend of your learning output
- **Peak Study Times**: Identify when you're most productive
- **Streak Status**: Current and longest study streaks
- **Time Per Subject**: Ranked view of subjects by study hours

## ✨ Premium Features

- **AI-Powered Summaries**: Generate intelligent summaries of your notes
- **Advanced Analytics**: Deep insights into your learning patterns
- **Personalized Insights**: Recommendations based on your study habits
- **Complete Data Export**: Export all your learning data anytime

## 🎓 For Students

Whether you're preparing for exams, building strong fundamentals, or exploring new subjects, ScholarVault provides the tools and insights to:

- Stay organized with all your study materials
- Track your progress visually
- Understand your learning patterns
- Maintain consistent study habits
- Achieve your academic goals

## 💡 Why ScholarVault?

- **Smart Tracking**: Invisible, automatic tracking without interruptions
- **Real Analytics**: Actual data-driven insights, not just mock metrics
- **Flexible Learning**: Study when and how you want, with detailed tracking
- **Privacy First**: Your study data is yours alone
- **Always Improving**: Regular updates with new features and improvements

## 📞 Support

For questions, feedback, or support, please reach out to us through our support channels.

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: December 24, 2025
