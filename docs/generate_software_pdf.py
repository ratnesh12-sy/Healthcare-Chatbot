import os
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        # Arial bold 15
        self.set_font('helvetica', 'B', 16)
        # Move to the right
        # Title
        self.cell(0, 10, 'Software and Libraries Used', 0, 1, 'C')
        # Line break
        self.ln(10)

    def chapter_title(self, num, title):
        # Arial 12
        self.set_font('helvetica', 'B', 14)
        # Background color
        self.set_fill_color(200, 220, 255)
        # Title
        self.cell(0, 10, f'{num}. {title}', 0, 1, 'L', 1)
        # Line break
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('helvetica', '', 12)
        # Output text with multi_cell
        # body is a list of tuples (bold_part, regular_part)
        for item in body:
            self.set_font('helvetica', 'B', 12)
            self.write(8, item[0])
            self.set_font('helvetica', '', 12)
            self.write(8, item[1])
            self.ln(8)
        self.ln()

    def add_section(self, num, title, body):
        self.chapter_title(num, title)
        self.chapter_body(body)

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# Intro text
pdf.set_font('helvetica', '', 12)
pdf.multi_cell(0, 8, 'The development of the project "Healthcare-Chatbot" involves the use of various software tools, frameworks, and libraries that contribute to efficient system design, scalability, and performance.')
pdf.ln(5)

# 1. Frontend Technologies
body1 = [
    ('* Next.js: ', 'A React-based framework used for building the user interface, supporting server-side rendering and optimized performance.'),
    ('* React.js: ', 'Used for creating reusable UI components and managing application state.'),
    ('* Axios / Fetch API: ', 'Used for making HTTP requests to backend services.')
]
pdf.add_section(1, 'Frontend Technologies', body1)

# 2. Backend Technologies
body2 = [
    ('* Spring Boot: ', 'A Java-based framework used to develop RESTful APIs and handle business logic efficiently.'),
    ('* Spring Security: ', 'Provides authentication and authorization mechanisms for securing endpoints.'),
    ('* JWT (JSON Web Tokens): ', 'Used for stateless authentication and secure session management.')
]
pdf.add_section(2, 'Backend Technologies', body2)

# 3. Database Technologies
body3 = [
    ('* PostgreSQL: ', 'A relational database system used for storing structured data such as users, doctors, and appointments.'),
    ('* JPA (Java Persistence API): ', 'Used for object-relational mapping between Java objects and database tables.'),
    ('* Hibernate: ', 'Implementation of JPA used for efficient database interaction.')
]
pdf.add_section(3, 'Database Technologies', body3)

# 4. AI and External APIs
body4 = [
    ('* LLM API (Groq/OpenAI-like service): ', 'Used for generating intelligent chatbot responses based on user queries.')
]
pdf.add_section(4, 'AI and External APIs', body4)

# 5. Development Tools
body5 = [
    ('* Node.js: ', 'Runtime environment required for running the frontend application.'),
    ('* npm (Node Package Manager): ', 'Used for managing frontend dependencies.'),
    ('* Maven: ', 'Build automation tool used for managing backend dependencies and project lifecycle.')
]
pdf.add_section(5, 'Development Tools', body5)

# 6. Version Control
body6 = [
    ('* Git: ', 'Used for source code management and version tracking.'),
    ('* GitHub: ', 'Used for hosting the project repository and collaboration.')
]
pdf.add_section(6, 'Version Control', body6)

# 7. Other Libraries and Utilities
body7 = [
    ('* Lombok: ', 'Reduces boilerplate code in Java classes (getters, setters, constructors).'),
    ('* Validation APIs (Jakarta Validation): ', 'Used for input validation in backend.'),
    ('* Logging Framework (SLF4J / Logback): ', 'Used for structured logging and debugging.')
]
pdf.add_section(7, 'Other Libraries and Utilities', body7)

# Conclusion
pdf.set_font('helvetica', 'I', 12)
pdf.multi_cell(0, 8, 'All these software components collectively ensure that the system is scalable, maintainable, and secure.')

output_path = os.path.join(os.path.dirname(__file__), 'Software_and_Libraries_Used.pdf')
pdf.output(output_path)
print(f'PDF generated successfully at {output_path}')
