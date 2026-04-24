-- Create three logical databases on first-boot of the postgres container.
-- Single shared cluster keeps ops simple for POC; each service owns its DB.

CREATE DATABASE n8n;
CREATE DATABASE langfuse;
CREATE DATABASE litellm;
