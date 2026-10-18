FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/Mist.Api/Mist.Api.csproj src/Mist.Api/
RUN dotnet restore src/Mist.Api/Mist.Api.csproj
COPY src/Mist.Api/ src/Mist.Api/
RUN dotnet publish src/Mist.Api/Mist.Api.csproj -c Release --no-restore -o /out
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN useradd -m mist && mkdir /app/private-uploads && chown -R mist:mist /app
COPY --from=build --chown=mist:mist /out ./
USER mist
EXPOSE 8080
ENTRYPOINT ["dotnet", "Mist.Api.dll"]
