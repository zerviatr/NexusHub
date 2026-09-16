// Copyright 2025 Lee Boonstra
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { Language } from '../lib/types';

interface LiveActivityTickerProps {
  lang?: Language;
}

/**
 * LiveActivityTicker Component
 *
 * Temporarily deactivated per user directive: notifications must be 100% verified
 * real transactions rather than synthetic fallbacks. Retained as a dormant stub
 * until sufficient live telemetry is gathered from the production cluster.
 */
export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = () => {
  return null;
};
