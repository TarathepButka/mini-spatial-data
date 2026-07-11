FROM golang:1.26-alpine AS build

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/mini-spatial-api ./cmd/api

FROM alpine:3.22

RUN adduser -D -H appuser
USER appuser
WORKDIR /app
COPY --from=build /bin/mini-spatial-api /app/mini-spatial-api

EXPOSE 8080
ENTRYPOINT ["/app/mini-spatial-api"]