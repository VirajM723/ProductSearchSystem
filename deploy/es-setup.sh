#!/bin/sh
# Creates a limited Elasticsearch user for the API. It can only touch the
# products* indices. Safe to run more than once; it also resets the password.
set -eu

ES="http://elasticsearch:9200"
AUTH="elastic:${ELASTIC_PASSWORD}"

echo "Waiting for Elasticsearch..."
until curl -fsS -u "$AUTH" "$ES/_cluster/health?wait_for_status=yellow&timeout=5s" >/dev/null 2>&1; do
  sleep 3
done

# Right after the first boot the security index can take a few seconds to
# come up and answers 503, so keep trying for a couple of minutes.
put() {
  tries=0
  until curl -fsS -u "$AUTH" -X PUT "$ES$1" -H 'Content-Type: application/json' -d "$2" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -ge 40 ]; then
      echo "Gave up on PUT $1" >&2
      curl -sS -u "$AUTH" -X PUT "$ES$1" -H 'Content-Type: application/json' -d "$2" >&2
      exit 1
    fi
    sleep 3
  done
}

put /_security/role/product_search_app \
  '{"cluster":["monitor"],"indices":[{"names":["products*"],"privileges":["all"]}]}'

put /_security/user/product_search_app \
  "{\"password\":\"${ES_APP_PASSWORD}\",\"roles\":[\"product_search_app\"]}"

echo "Elasticsearch user product_search_app is ready"
