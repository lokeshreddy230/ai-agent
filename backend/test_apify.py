import requests
res = requests.get('https://api.apify.com/v2/store', params={'search': 'linkedin posts'}).json()
for i in res.get('data', {}).get('items', [])[:5]:
    print(i.get('username') + '/' + i.get('name'))
