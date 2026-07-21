'use client';

import { Share2 } from 'lucide-react';
import MarketingTabs from '../MarketingTabs';
import WeeklyScore from './WeeklyScore';
import TopPosts from './TopPosts';
import GoldenSetStatus from './GoldenSetStatus';
import QuickRepost from './QuickRepost';
import DropZone from './DropZone';
import QueueList from './QueueList';
import ManageMedia from './ManageMedia';

export default function MarketingSocialPage() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><Share2 size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Social</h1>
        <p className="subtitle">Drop WIP content, triage the queue, quick-repost — this is the whole weekly loop.</p>
      </div>

      <MarketingTabs />

      <WeeklyScore />
      <TopPosts />
      <GoldenSetStatus />
      <QuickRepost />
      <DropZone />
      <ManageMedia />
      <QueueList />
    </div>
  );
}
