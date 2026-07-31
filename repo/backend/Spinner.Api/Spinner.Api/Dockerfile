FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Spinner.Api/Spinner.Api.csproj", "Spinner.Api/"]
RUN dotnet restore "Spinner.Api/Spinner.Api.csproj"

COPY . .
WORKDIR "/src/Spinner.Api"
RUN dotnet publish "Spinner.Api.csproj" \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true \
    DOTNET_EnableDiagnostics=0

EXPOSE 8080

COPY --from=build /app/publish .
USER $APP_UID

ENTRYPOINT ["dotnet", "Spinner.Api.dll"]
