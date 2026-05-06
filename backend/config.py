from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MOCK_MODE: bool = True
    LLM_PROVIDER: str = "mock"
    AWS_REGION: str = "us-east-1"
    DYNAMODB_TABLE: str = "TrustLendApplications"
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-haiku-20240307-v1:0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
