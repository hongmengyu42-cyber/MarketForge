# ──── Stage 1: Build JAR ────
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /build

# Cache maven dependencies
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B -q

# Build application
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B -q

# ──── Stage 2: Runtime ────
FROM eclipse-temurin:17-jre-jammy AS runtime

# Security: Create non-root system user and group
RUN groupadd -r marketforge --gid=1001 && \
    useradd -r -g marketforge --uid=1001 --create-home --shell /bin/bash marketforge

WORKDIR /app

# Prepare upload directory with strict ownership
RUN mkdir -p /app/uploads && chown -R marketforge:marketforge /app

# Copy built artifact from builder stage
COPY --from=builder --chown=marketforge:marketforge /build/target/marketforge-backend-1.0.0.jar app.jar

USER marketforge

EXPOSE 8080

# Production JVM optimizations for containerized environments
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}"]
