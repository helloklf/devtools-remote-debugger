<template>
  <div class="tips">
    {{ $t('useTitle') }}
    <div class="code">
      &lt;script src=&quot;{{ DEBUG_HOST }}{{ DEBUG_PREFIX }}/dist/cdp.js&quot;&gt;&lt;/script&gt;
    </div>
    <div class="notice">
      <div class="title">{{ $t('notice') }}</div>
      <div>{{ $t('notice_1') }}</div>
      <ul>
        <li>{{ $t('notice_2') }}<code>crossorigin="anonymous"</code></li>
        <li>{{ $t('notice_3') }}<code>crossorigin="anonymous"</code></li>
        <li>{{ $t('notice_4') }}<code>Access-Control-Allow-Origin</code></li>
      </ul>
    </div>
  </div>
</template>

<script>
const DEBUG_HOST = process.env.DEBUG_HOST;
const DEBUG_PREFIX = process.env.DEBUG_PREFIX;
export default {
  data () {
    return {
      DEBUG_HOST,
      DEBUG_PREFIX
    }
  }
}
</script>

<style>
  .tips {
    padding-top: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  input {
    position: absolute;
    clip: rect(0, 0, 0, 0);
  }

  .notice {
    text-align: left;
    margin-top: 64px;
    font-size: 14px;
  }

  .notice .title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 16px;
  }

  .notice li {
    margin-bottom: 8px;
  }

  .notice code {
    color: #0052D9;
    padding: 0 4px;
  }

  .code {
    padding: 16px;
    background-color: #f1f1f1;
    border-radius: 4px;
    margin: 16px 0;
    color: #717171;
  }
</style>
