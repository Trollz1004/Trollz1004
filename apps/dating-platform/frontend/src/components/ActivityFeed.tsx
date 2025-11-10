import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  ShoppingCart,
  Favorite,
  Person,
  AccountBalance,
  Campaign,
  Mail,
} from '@mui/icons-material';
import apiClient from '../api/axios';

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: {
    displayName: string;
    avatar?: string;
  };
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'purchase':
      return <ShoppingCart />;
    case 'donation':
      return <Favorite />;
    case 'profile_update':
      return <Person />;
    case 'fundraiser':
      return <Campaign />;
    case 'payment':
      return <AccountBalance />;
    case 'newsletter':
      return <Mail />;
    default:
      return <Person />;
  }
};

const getActivityColor = (type: string): any => {
  switch (type) {
    case 'purchase':
      return 'primary';
    case 'donation':
      return 'error';
    case 'profile_update':
      return 'info';
    case 'fundraiser':
      return 'warning';
    case 'payment':
      return 'success';
    default:
      return 'grey';
  }
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [tabValue]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const endpoint = tabValue === 0 ? '/api/activity/feed' : '/api/activity/global';
      const { data } = await apiClient.get(endpoint);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Activity Timeline
        </Typography>

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="My Activity" />
          <Tab label="Global Feed" />
        </Tabs>

        {loading ? (
          <Typography>Loading activities...</Typography>
        ) : activities.length === 0 ? (
          <Typography>No activities to display</Typography>
        ) : (
          <Timeline position="alternate">
            {activities.map((activity, index) => (
              <TimelineItem key={activity.id}>
                <TimelineOppositeContent color="text.secondary">
                  {formatDate(activity.createdAt)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={getActivityColor(activity.type)}>
                    {getActivityIcon(activity.type)}
                  </TimelineDot>
                  {index < activities.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {activity.user && (
                      <Avatar src={activity.user.avatar} sx={{ width: 24, height: 24 }}>
                        {activity.user.displayName?.[0]}
                      </Avatar>
                    )}
                    <Typography>
                      {activity.user && <strong>{activity.user.displayName}</strong>}{' '}
                      {activity.description}
                    </Typography>
                  </Box>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}
