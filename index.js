require('isomorphic-fetch')
const fs = require('fs')

const assumedMaxRepoNumber = 150300000

const main = async () => {
  const options = {
    method: 'GET',
    headers: {
      'User-Agent': 'kamataryo'
    }
  }

  let reult = {}
  let rateLimit
  let rateLimitRemaining
  let rateLimitResetAt
  let since

  let url = 'https://api.github.com/repositories?since=150000000'

  while (!!url || !!since) {
    try {
      result = await fetch(url, options).then(async res => {
        rateLimit = parseInt(res.headers.get('X-RateLimit-Limit'))
        rateLimitRemaining = parseInt(res.headers.get('X-RateLimit-Remaining'))
        rateLimitResetAt = parseInt(res.headers.get('X-RateLimit-Reset'))
        const Link = res.headers.get('Link') || ''

        while (rateLimitResetAt > new Date().getTime() / 1000) {
          console.log(rateLimitResetAt, new Date().getTime() / 1000)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        const match =
          Link.match(
            /<(https:\/\/api.github.com\/repositories\?since=([0-9]+))>/
          ) || []
        url = match[1]
        since = match[2]

        return res.json()
      })
    } catch (e) {
      console.log(e)
      process.stdout.write(JSON.stringify(e))
      process.exit(1)
    }

    const packageJSONs = result.map(
      x =>
        `https://raw.githubusercontent.com/${x.full_name}/master/package.json`
    )

    Promise.all(
      packageJSONs.map(packageJSON =>
        fetch(packageJSON)
          .then(res => (res.ok ? res.json() : {}))
          .catch(() => ({}))
      )
    ).then(packages => {
      const names = packages
        .map(({ scripts }) => Object.keys(scripts || {}))
        .reduce((prev, x) => [...prev, ...x], [])

      // console.log(rateLimit, rateLimitRemaining, url, since)
      console.log(rateLimitRemaining, names.join(','))
    })

    if (rateLimitRemaining < 10) {
      while (rateLimitResetAt > new Date().getTime() / 1000) {
        // console.log(rateLimitResetAt, new Date().getTime() / 1000)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1200))
  }
}

main()

// fs.writeFileSync('./result.json', JSON.stringify(result))
