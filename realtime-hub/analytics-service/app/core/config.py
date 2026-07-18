from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "realtime_analytics"
    client_origin: str = "http://localhost:5173"
    binance_ws_url: str = "wss://stream.binance.com:9443/stream"
    default_symbols: str = "btcusdt,ethusdt,solusdt"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def symbol_list(self) -> list[str]:
        return [s.strip().lower() for s in self.default_symbols.split(",") if s.strip()]


settings = Settings()
