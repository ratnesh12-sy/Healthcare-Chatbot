# HealthCare AI Assistant 🏥

An AI-powered Healthcare Chatbot and Appointment System built with Next.js, Spring Boot, Node.js, and MySQL.

## ✨ Features
- **AI Chatbot**: Intelligent medical guidance using OpenAI.
- **Appointment Booking**: Connect with specialists easily.
- **Dashboards**: Role-based access for Patients, Doctors, and Admins.
- **Security**: JWT-based authentication and secure data storage.

## 🛠 Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
- **Middleware**: Node.js, Express (API Gateway)
- **Backend**: Java Spring Boot, Spring Security, JPA
- **Database**: MySQL
- **AI**: OpenAI API

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Java 17+
- MySQL 8.0
- Docker (optional)

### Setup
1. **Clone the repository**
2. **Database**: Run `database/schema.sql` in your MySQL instance.
3. **OpenAI Key**: Add your `OPENAI_API_KEY` to `middleware/.env`.
4. **Run with Docker**:
   ```bash
   docker-compose up --build
   ```

### Manual Run
- **Backend**: `cd backend && mvn spring-boot:run`
- **Middleware**: `cd middleware && npm start`
- **Frontend**: `cd frontend && npm run dev`

## 📄 Documentation
- [Project Report Outline](docs/PROJECT_REPORT.md)
- [API Docs](http://localhost:8080/swagger-ui.html) (Ensure backend is running)
