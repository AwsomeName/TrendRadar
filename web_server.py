# coding=utf-8

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import yaml

# 导入主程序模块
from main import (
    load_config, CONFIG, DataFetcher, NewsAnalyzer,
    load_frequency_words, get_beijing_time, format_date_folder
)

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)  # 允许跨域请求

# 全局变量
analyzer = None


def init_analyzer():
    """初始化分析器"""
    global analyzer
    if analyzer is None:
        # 确保配置已加载
        load_config()
        analyzer = NewsAnalyzer()


@app.route('/')
def index():
    """主页"""
    return send_from_directory('.', 'index.html')


@app.route('/admin.html')
def admin():
    """管理页面"""
    return send_from_directory('.', 'admin.html')


@app.route('/api/config', methods=['GET'])
def get_config():
    """获取当前配置"""
    try:
        config_path = os.environ.get("CONFIG_PATH", "config/config.yaml")
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = yaml.safe_load(f)
        return jsonify({"success": True, "data": config_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/config', methods=['POST'])
def update_config():
    """更新配置"""
    try:
        config_data = request.json
        config_path = os.environ.get("CONFIG_PATH", "config/config.yaml")
        
        # 备份原配置
        backup_path = f"{config_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(config_path, backup_path)
        
        # 写入新配置
        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)
        
        return jsonify({"success": True, "message": "配置更新成功"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/keywords', methods=['GET'])
def get_keywords():
    """获取关键词列表"""
    try:
        frequency_file = "config/frequency_words.txt"
        word_groups, filter_words = load_frequency_words(frequency_file)
        
        # 读取原始文件内容
        with open(frequency_file, "r", encoding="utf-8") as f:
            content = f.read()
        
        return jsonify({
            "success": True, 
            "data": {
                "content": content,
                "word_groups": word_groups,
                "filter_words": filter_words
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/keywords', methods=['POST'])
def update_keywords():
    """更新关键词"""
    try:
        data = request.json
        content = data.get('content', '')
        frequency_file = "config/frequency_words.txt"
        
        # 备份原文件
        backup_path = f"{frequency_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(frequency_file, backup_path)
        
        # 写入新内容
        with open(frequency_file, "w", encoding="utf-8") as f:
            f.write(content)
        
        return jsonify({"success": True, "message": "关键词更新成功"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/manual-push', methods=['POST'])
def manual_push():
    """手动推送"""
    try:
        import traceback
        
        print("开始初始化分析器...")
        init_analyzer()
        print("分析器初始化完成")
        
        # 执行分析和推送
        print("开始执行分析和推送...")
        result = analyzer.run()
        print(f"推送完成，结果: {result}")
        
        return jsonify({
            "success": True, 
            "message": "手动推送完成",
            "result": result
        })
            
    except Exception as e:
        import traceback
        error_msg = f"推送失败: {str(e)}"
        print(f"推送错误: {error_msg}")
        print(f"错误堆栈: {traceback.format_exc()}")
        return jsonify({"success": False, "error": error_msg}), 500


@app.route('/api/test-crawl', methods=['POST'])
def test_crawl():
    """测试爬取数据"""
    try:
        init_analyzer()
        
        # 获取平台列表
        platforms = CONFIG.get('PLATFORMS', [])
        platform_ids = [p['id'] for p in platforms[:3]]  # 只测试前3个平台
        
        # 创建数据抓取器
        proxy_url = CONFIG.get('DEFAULT_PROXY') if CONFIG.get('USE_PROXY') else None
        fetcher = DataFetcher(proxy_url)
        
        # 爬取数据
        results, id_to_name, failed_ids = fetcher.crawl_websites(platform_ids, 500)
        
        # 统计信息
        total_news = sum(len(news_list) for news_list in results.values())
        
        return jsonify({
            "success": True,
            "data": {
                "total_platforms": len(platform_ids),
                "success_platforms": len(results),
                "failed_platforms": len(failed_ids),
                "total_news": total_news,
                "platform_details": {
                    platform_id: {
                        "name": id_to_name.get(platform_id, platform_id),
                        "news_count": len(news_list),
                        "sample_titles": [news.get('title', '') for news in news_list[:3]]
                    }
                    for platform_id, news_list in results.items()
                },
                "failed_ids": failed_ids
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """获取历史记录"""
    try:
        output_dir = Path("output")
        history_data = []
        
        if output_dir.exists():
            # 获取所有日期文件夹
            date_folders = [d for d in output_dir.iterdir() if d.is_dir()]
            date_folders.sort(reverse=True)  # 按日期倒序
            
            for date_folder in date_folders[:30]:  # 最近30天
                date_str = date_folder.name
                html_dir = date_folder / "html"
                txt_dir = date_folder / "txt"
                
                files = []
                
                # 获取HTML文件
                if html_dir.exists():
                    for html_file in html_dir.glob("*.html"):
                        files.append({
                            "name": html_file.name,
                            "type": "html",
                            "path": str(html_file.relative_to(output_dir)),
                            "size": html_file.stat().st_size,
                            "modified": datetime.fromtimestamp(html_file.stat().st_mtime).strftime('%H:%M:%S')
                        })
                
                # 获取TXT文件
                if txt_dir.exists():
                    for txt_file in txt_dir.glob("*.txt"):
                        files.append({
                            "name": txt_file.name,
                            "type": "txt",
                            "path": str(txt_file.relative_to(output_dir)),
                            "size": txt_file.stat().st_size,
                            "modified": datetime.fromtimestamp(txt_file.stat().st_mtime).strftime('%H:%M:%S')
                        })
                
                if files:
                    history_data.append({
                        "date": date_str,
                        "files": sorted(files, key=lambda x: x['modified'], reverse=True)
                    })
        
        return jsonify({"success": True, "data": history_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/history/<path:file_path>')
def get_history_file(file_path):
    """获取历史文件内容"""
    try:
        full_path = Path("output") / file_path
        
        if not full_path.exists():
            return jsonify({"success": False, "error": "文件不存在"}), 404
        
        if full_path.suffix == '.html':
            return send_from_directory(full_path.parent, full_path.name)
        else:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            return jsonify({"success": True, "content": content})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/platforms', methods=['GET'])
def get_platforms():
    """获取平台配置"""
    try:
        config_path = os.environ.get("CONFIG_PATH", "config/config.yaml")
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = yaml.safe_load(f)
        
        platforms = config_data.get('platforms', [])
        return jsonify({"success": True, "data": platforms})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/platforms', methods=['POST'])
def update_platforms():
    """更新平台配置"""
    try:
        data = request.json
        platforms = data.get('platforms', [])
        
        config_path = os.environ.get("CONFIG_PATH", "config/config.yaml")
        
        # 读取当前配置
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = yaml.safe_load(f)
        
        # 备份原配置
        backup_path = f"{config_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(config_path, backup_path)
        
        # 更新平台配置
        config_data['platforms'] = platforms
        
        # 写入新配置
        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)
        
        return jsonify({"success": True, "message": "平台配置更新成功"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/status', methods=['GET'])
def get_status():
    """获取系统状态"""
    try:
        # 检查配置文件
        config_exists = Path("config/config.yaml").exists()
        keywords_exists = Path("config/frequency_words.txt").exists()
        
        # 检查输出目录
        output_dir = Path("output")
        today_folder = output_dir / format_date_folder()
        today_has_data = today_folder.exists() and any(today_folder.iterdir())
        
        # 获取最近的文件
        latest_file = None
        if output_dir.exists():
            all_files = list(output_dir.rglob("*.html")) + list(output_dir.rglob("*.txt"))
            if all_files:
                latest_file = max(all_files, key=lambda x: x.stat().st_mtime)
                latest_file = {
                    "name": latest_file.name,
                    "path": str(latest_file.relative_to(output_dir)),
                    "modified": datetime.fromtimestamp(latest_file.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                }
        
        return jsonify({
            "success": True,
            "data": {
                "config_exists": config_exists,
                "keywords_exists": keywords_exists,
                "today_has_data": today_has_data,
                "latest_file": latest_file,
                "current_time": get_beijing_time().strftime('%Y-%m-%d %H:%M:%S'),
                "version": "2.0.3"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print("🚀 TrendRadar Web管理界面启动中...")
    print("📱 访问地址: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)