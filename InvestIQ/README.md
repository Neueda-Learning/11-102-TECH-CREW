# InvestIQ

InvestIQ is a Spring Boot application that now targets **Java 17** for builds and tests.

## Java version

- Source/target: Java 17
- Recommended local JDK for tests: Java 17

## Run tests on Windows

If Java 25 is installed globally, use the included script to force Java 17 for Maven tests:

```bat
.\test-java17.cmd
```

That script sets:

```bat
JAVA_HOME=C:\Program Files\Java\jdk-17
```

and runs the Maven wrapper test suite.

## Manual run

```bat
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%
.\mvnw.cmd test
```

