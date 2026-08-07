# Multi-stage build for InvestIQ Spring Boot application (Java 17)
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# Download dependencies first (layer cache optimization)
COPY pom.xml ./
RUN mvn -B dependency:go-offline

# Build the application
COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Runtime image ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S investiq && adduser -S investiq -G investiq

COPY --from=build /workspace/target/*.jar app.jar
RUN chown investiq:investiq app.jar

USER investiq
EXPOSE 8083

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8083/v3/api-docs >/dev/null || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

