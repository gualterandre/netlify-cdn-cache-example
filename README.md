# netlify-cdn-cache-example

This repository serves as an example of how the stale-while-revalidate caching strategy is broken when the CDN header
changes. This will result in a stale cache, which will never be updated, and caching headers that are applied
incorrectly.

## How to use

Below is a list of steps to reproduce the issue.

### Happy path

- Deploy the example to Netlify
- Visit the page in the browser, see the following HTML and see the logs in the console for the `index`-function:

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_1]
  
  Headers:
  Cache-Control: public,max-age=0,must-revalidate
  Cache-Status: "Netlify Durable"; fwd=miss; stored
  Cache-Status: "Netlify Edge"; fwd=miss
  
  // Netlify function logs
  SSR - Random number [$RANDOM_NUMBER_1]
  ```

- Wait for less than 60 seconds and refresh the page
- See that the number hasn't changed and the log is still the same. The duration is below the `max-age`
- Between 60 and 120 seconds after the page has been visited, refresh the page
- See that the number of the HTML is still the same, but the log has changed with a new random number. The duration is
  above the `max-age` and below the `stale-while-revalidate` duration.

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_1]
  
  Headers:
  Cache-Control: public,max-age=0,must-revalidate
  Cache-Status: "Netlify Edge"; hit; fwd=stale
  
  // Netlify function logs
  SSR - Random number [$RANDOM_NUMBER_2]
  ```

- Refresh the page again and see the new `$RANDOM_NUMBER_2` in the HTML

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_2]
  
  Headers:
  Cache-Control: public,max-age=0,must-revalidate
  Cache-Status: "Netlify Durable"; hit; ttl=28
  Cache-Status: "Netlify Edge"; fwd=miss
  ```

- See that the number hasn't changed and the log is still the same. The duration is below the `max-age`
- Wait for more than 120 seconds and refresh the page
- See that the number of the HTML has changed and the log has changed with a random number. The duration is above the
  `max-age` and below the `stale-while-revalidate` duration.

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_3]
  
  Headers:
  Cache-Status: "Netlify Durable"; fwd=stale; ttl=-132; stored
  Cache-Status: "Netlify Edge"; fwd=miss
  
  // Netlify function logs
  SSR - Random number [$RANDOM_NUMBER_3]
  ```

### Not so happy path

- Visit the page in the browser, see the following HTML and see the logs in the console for the `index`-function:

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_1]
  
  Headers:
  Cache-Status: "Netlify Durable"; fwd=miss; stored
  Cache-Status: "Netlify Edge"; fwd=miss

  // Netlify function logs
  SSR - Random number [$RANDOM_NUMBER_1]
  ```

- Wait for less than 60 seconds fire the following cURL command:

  ```bash
  curl --location '${NETLIFY_SITE_URL}/update-caching' \
    --header 'Content-Type: application/json' \
    --data '{ "caching": false }'
  ```
  This will disable caching for the page by removing the `Netlify-CDN-Cache-Control` header.

- Between 60 and 120 seconds after the page has been visited, refresh the page
- See that the number of the HTML is still the same, but the log has changed with a new random number. The duration is
  above the `max-age` and below the `stale-while-revalidate` duration.

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_1]
  
  Cache-Control: public,max-age=60,stale-while-revalidate=120,durable
  Cache-Status: "Netlify Edge"; hit; fwd=stale

  // Netlify function logs
  SSR - Random number [$RANDOM_NUMBER_2]
  ```

- **⚠️ Refresh the page again and see the same `$RANDOM_NUMBER_1` in the HTML ⚠️**

  **THIS SHOULD NOT HAPPEN AND IT SHOULD RETURN THE NEW `$RANDOM_NUMBER_2` WITH THE NEW CACHE HEADERS**

  ```
  # Actual
  Response: Testing Netlify cache [$RANDOM_NUMBER_1]
  
  Cache-Control: public,max-age=60,stale-while-revalidate=120,durable
  Cache-Status: "Netlify Edge"; hit
  
  # Expected
  Response: Testing Netlify cache [$RANDOM_NUMBER_2]
  
  Cache-Control: public,max-age=0,must-revalidate
  Cache-Status: "Netlify Durable"; fwd=stale; ttl=-80; stored
  Cache-Status: "Netlify Edge"; fwd=stale
  ```

- Wait for more than 120 seconds and refresh the page
- See that the number of the HTML has changed and the log has changed with a random number. The duration is above the
  `max-age` and below the `stale-while-revalidate` duration.

  ```
  // HTML response
  Response: Testing Netlify cache [$RANDOM_NUMBER_3]
  
  Headers:
  Cache-Control: public,max-age=0,must-revalidate
  Cache-Status: "Netlify Durable"; fwd=stale; ttl=-80; stored
  Cache-Status: "Netlify Edge"; fwd=stale
  
  // Netlify function logs
  SSR - Random number [$RANDOM_NUMBER_3]
  ```
