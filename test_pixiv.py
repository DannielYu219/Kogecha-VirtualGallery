#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pixiv Cookie测试脚本
"""

import requests
import urllib3
import json

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

COOKIE = "__Secure-3PAPISID=9HzXmvwVYBpQfVx-/ACbC6G91-gPTq2u1g; __Secure-3PSID=g.a000-Ahlr27VjFQr3JPstkT9zQBaQWUsPAPrXILlYj5TG1cmxok2j6sTd6G0LRQB1WMTTRdrJQACgYKAUoSARcSFQHGX2Mi51l-JBGeQZFm6kFddMBoZRoVAUF8yKpRhgHGdOz13bpbTxDMb-pV0076; __Secure-3PSIDTS=sidts-CjIBhkeRd4c27UAm3nr45nfEhj_N7ZYWvSEVSA7YzAnuvUsxBO-JeiG6i6YIrvgX9_VFRhAA; NID=532=aOZzGGWvV5--KhtAzF6RauFRHPj88kI5g9mfh2tFYFGhOKXqnu0ZzJh4Akw6BIHLG8XEjcbQr3f5nCGwx7mRrtXb0OvgIuK_nc4WHh269NVHzl_4deBONkJaIxd7-WaRyIPrU4Gv1iCXLiq7HWvFUr-u1aJ5TI4zQJvUUIClSfud_Yml_2M3Jr7EqZUm6I_DGolrXPfP870SNhTb80-SRqhWmub4GQ847ebFr3hSalYgvSUpUDQ4F-RBFR2UFUyxlyIsGo49Iub6fpaKdtWQc7qnm-QMpyjgJ1TlfY0HDrYVh56QlyhPokUCRuujzcksP8vu0MHU2lUHrCmSao1WbTyhxKGb4uU_uxORVMmUC0UoxBJ8i_eEy2Y80ikjLKeN5Wk7jj7K9UI7fpOpnunpn9yYsow5JTJX0mM6SvT6-9oyDlDxwxBaDHnQnwjCR0qZYFEgGVabPwBpoD4dUIS0ZnHMO49IrvKey3X2pA5SbzsuTyfYBqKJ1Iw1u-FlfbnbzTQecJxn7wEzFDnJSybhEjIoRzVOJhzz0t7S1hlx67gEYPTgYZhFvtiYD6S18r35UHeqFNMiLoC9QMVRRtcKpOeYsYtT1c0tjOMslfrM_FK95Z97Olgqh8QXL3IxpAu_vA4hD-MnBuQlTGXsPKH4XDaHvnqCI5pNawiTdJRzTci8yrgHaFF0wwK4uRzT64kDOs-pHwNsSwDrtak6O94x4MNS8PeSj5sVxg; __Secure-3PSIDCC=AKEyXzUHSvRfFBu8FrS6ecnVtU6ytxTM5043a1wkMhX_lwo9ztxApySHcGmetIIqUhl7-AOX_i8"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7",
    "Referer": "https://www.pixiv.net/",
    "Cookie": COOKIE,
    "X-Requested-With": "XMLHttpRequest",
}

USER_ID = "12845810"

def test_user_info():
    """测试获取用户信息"""
    url = f"https://www.pixiv.net/ajax/user/{USER_ID}?lang=zh"
    print(f"[测试] 获取用户信息: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=30)
        print(f"  状态码: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("error") is False:
                body = data.get("body", {})
                print(f"  ✓ 用户名: {body.get('name')}")
                print(f"  ✓ 用户ID: {body.get('userId')}")
                return True
            else:
                print(f"  ✗ API错误: {data.get('message')}")
                return False
        else:
            print(f"  ✗ 请求失败: {resp.status_code}")
            print(f"  响应: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"  ✗ 异常: {e}")
        return False

def test_artwork_list():
    """测试获取作品列表"""
    url = f"https://www.pixiv.net/ajax/user/{USER_ID}/profile/all?lang=zh"
    print(f"\n[测试] 获取作品列表: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=30)
        print(f"  状态码: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("error") is False:
                body = data.get("body", {})
                illusts = list(body.get("illusts", {}).keys())
                manga = list(body.get("manga", {}).keys())
                print(f"  ✓ 插画数量: {len(illusts)}")
                print(f"  ✓ 漫画数量: {len(manga)}")
                print(f"  ✓ 总计: {len(illusts) + len(manga)}")
                if illusts:
                    print(f"  ✓ 第一个作品ID: {illusts[0]}")
                return illusts + manga
            else:
                print(f"  ✗ API错误: {data.get('message')}")
                return []
        else:
            print(f"  ✗ 请求失败: {resp.status_code}")
            return []
    except Exception as e:
        print(f"  ✗ 异常: {e}")
        return []

def test_artwork_detail(artwork_id):
    """测试获取作品详情"""
    url = f"https://www.pixiv.net/ajax/illust/{artwork_id}?lang=zh"
    print(f"\n[测试] 获取作品详情: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=30)
        print(f"  状态码: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("error") is False:
                body = data.get("body", {})
                print(f"  ✓ 标题: {body.get('title')}")
                print(f"  ✓ 类型: {body.get('illustType')}")
                print(f"  ✓ 页数: {body.get('pageCount')}")
                return body
            else:
                print(f"  ✗ API错误: {data.get('message')}")
                return None
        else:
            print(f"  ✗ 请求失败: {resp.status_code}")
            return None
    except Exception as e:
        print(f"  ✗ 异常: {e}")
        return None

def test_artwork_pages(artwork_id):
    """测试获取作品页面（原图URL）"""
    url = f"https://www.pixiv.net/ajax/illust/{artwork_id}/pages?lang=zh"
    print(f"\n[测试] 获取作品页面: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=30)
        print(f"  状态码: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("error") is False:
                pages = data.get("body", [])
                print(f"  ✓ 页面数: {len(pages)}")
                if pages:
                    urls = pages[0].get("urls", {})
                    print(f"  ✓ 原图URL: {urls.get('original', 'N/A')}")
                return pages
            else:
                print(f"  ✗ API错误: {data.get('message')}")
                return []
        else:
            print(f"  ✗ 请求失败: {resp.status_code}")
            return []
    except Exception as e:
        print(f"  ✗ 异常: {e}")
        return []

def test_image_download(img_url, artwork_id):
    """测试下载单张图片"""
    print(f"\n[测试] 下载图片: {img_url}")
    img_headers = {
        "User-Agent": HEADERS["User-Agent"],
        "Referer": f"https://www.pixiv.net/artworks/{artwork_id}",
        "Cookie": COOKIE,
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    }
    try:
        resp = requests.get(img_url, headers=img_headers, verify=False, timeout=30, stream=True)
        print(f"  状态码: {resp.status_code}")
        if resp.status_code == 200:
            content_length = len(resp.content)
            print(f"  ✓ 下载成功: {content_length} bytes")
            return True
        else:
            print(f"  ✗ 下载失败: {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ 异常: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Pixiv Cookie 测试")
    print("=" * 60)

    # 1. 测试用户信息
    user_ok = test_user_info()

    # 2. 测试作品列表
    artwork_ids = test_artwork_list()

    if not artwork_ids:
        print("\n" + "=" * 60)
        print("[✗] 测试失败: 无法获取作品列表，Cookie可能无效或过期")
        print("=" * 60)
        exit(1)

    # 3. 测试作品详情
    test_id = artwork_ids[0]
    detail = test_artwork_detail(test_id)

    # 4. 测试作品页面
    pages = test_artwork_pages(test_id)

    # 5. 测试图片下载
    if pages:
        img_url = pages[0].get("urls", {}).get("original")
        if img_url:
            download_ok = test_image_download(img_url, test_id)

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
