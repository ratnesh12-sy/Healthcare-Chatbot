# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
# Optimize JVM for faster startup in constrained environments (like Render Free Tier)
ENTRYPOINT ["java", "-XX:TieredStopAtLevel=1", "-noverify", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
