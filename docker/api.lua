local balancer = require "ngx.balancer"

local api_host = os.getenv("API_HOST")
local api_port = tonumber(os.getenv("API_PORT"))

if not api_host then
    ngx.log(ngx.ERR, "API_HOST is not set")
    ngx.exit(500)
end
if not api_port then
    ngx.log(ngx.ERR, "API_PORT is not a valid number: ", api_port)
    ngx.exit(500)
end

local ok, err = balancer.set_current_peer(api_host, api_port)
if not ok then
    ngx.log(ngx.ERR, "Failed to set peer: ", err)
    ngx.exit(502)
end
