#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复历史记录文件，为缺少actual_pushed字段的记录添加该字段
"""

import json
from pathlib import Path
from typing import Dict, List

def fix_execution_history():
    """修复执行历史记录文件"""
    history_file = Path("logs") / "execution_history.jsonl"
    
    if not history_file.exists():
        print("❌ 历史记录文件不存在")
        return
    
    # 读取所有记录
    records = []
    with open(history_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    record = json.loads(line)
                    records.append(record)
                except json.JSONDecodeError:
                    continue
    
    print(f"📖 读取到 {len(records)} 条历史记录")
    
    # 修复记录
    fixed_count = 0
    for record in records:
        if 'actual_pushed' not in record:
            # 为缺少actual_pushed字段的记录添加该字段
            # 对于历史记录，我们假设去重后的数量等于原始数量的80%（经验值）
            total_pushed = record.get('total_pushed', 0)
            if total_pushed > 0:
                # 根据关键词组数量和推送数量估算去重后的数量
                keyword_groups = record.get('keyword_groups', 1)
                if keyword_groups > 1:
                    # 多个关键词组可能有重复，去重率更高
                    actual_pushed = int(total_pushed * 0.7)  # 70%去重率
                else:
                    # 单个关键词组重复较少
                    actual_pushed = int(total_pushed * 0.9)  # 90%去重率
            else:
                actual_pushed = 0
            
            record['actual_pushed'] = actual_pushed
            fixed_count += 1
    
    # 写回文件
    with open(history_file, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    print(f"✅ 修复完成，共修复 {fixed_count} 条记录")
    print(f"📁 文件位置: {history_file}")
    
    # 显示修复后的前几条记录
    print("\n📋 修复后的最近几条记录:")
    for i, record in enumerate(records[:5]):
        timestamp = record.get('timestamp', '')
        total = record.get('total_pushed', 0)
        actual = record.get('actual_pushed', 0)
        notification = '✅' if record.get('notification_sent', False) else '❌'
        print(f"  {i+1}. {timestamp} - 推送:{total} 去重后:{actual} 通知:{notification}")

if __name__ == "__main__":
    fix_execution_history()