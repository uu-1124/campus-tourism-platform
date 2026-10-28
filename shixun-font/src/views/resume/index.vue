<template>
  <div class="resume-page">
    <section>
      <h2>个人信息</h2>
      <el-alert title="请仔细核对您填写的姓名、证件类型和证件号，简历保存后无法再次修改。若您为中国国籍，请优先使用“身份证”类型，并准确填写身份证号。" type="warning" show-icon :closable="false" />
      <div class="photos"><photo-picker label="上传证件照" v-model="form.idPhoto" /><photo-picker label="上传生活照" v-model="form.lifePhoto" /></div>
      <div class="grid">
        <field label="姓名"><el-input v-model="form.name" placeholder="请输入" /></field>
        <field label="证件类型"><el-select v-model="form.idType" placeholder="请选择"><el-option label="身份证" value="身份证" /><el-option label="护照" value="护照" /></el-select></field>
        <field label="证件号"><el-input v-model="form.idNumber" placeholder="请输入" /></field>
        <field label="性别"><el-radio-group v-model="form.gender"><el-radio label="男" /><el-radio label="女" /></el-radio-group></field>
        <field label="出生日期"><el-date-picker v-model="form.birthday" placeholder="请选择日期" /></field>
        <field label="手机号"><el-input v-model="form.phone" /></field>
        <field label="邮箱"><el-input v-model="form.email" placeholder="请输入" /></field>
        <field label="政治面貌"><select-box v-model="form.politics" /></field>
        <field label="民族"><select-box v-model="form.nation" /></field>
        <field label="体重"><el-input v-model="form.weight" placeholder="请输入您的体重"><template slot="append">KG</template></el-input></field>
        <field label="身高"><el-input v-model="form.height" placeholder="请输入您的身高"><template slot="append">CM</template></el-input></field>
        <field label="生源地"><select-box v-model="form.origin" /></field>
        <field label="出生地"><select-box v-model="form.birthplace" /></field>
        <field label="招聘信息来源"><select-box v-model="form.source" /></field>
        <field label="面试期望城市"><select-box v-model="form.city" /></field>
        <field label="婚姻状况（可选）"><select-box v-model="form.marriage" /></field>
        <field label="现居住地"><el-input v-model="form.address" placeholder="请输入详细地址，例如XX省XX市XX区XX街..." /></field>
        <field label="是否参加过正式工作"><el-radio-group v-model="form.worked"><el-radio label="是" /><el-radio label="否" /></el-radio-group></field>
        <field label="自我评价" class="span2"><el-input v-model="form.evaluation" placeholder="可用5个词描述你的性格" /></field>
      </div>
    </section>
    <repeat-section title="教育经历" :items="education" @add="education.push(newEducation())" @remove="education.splice($event,1)">
      <template slot-scope="{ item }"><field label="学历"><el-select v-model="item.degree"><el-option label="高中" value="高中" /><el-option label="本科" value="本科" /><el-option label="硕士" value="硕士" /></el-select></field><field label="学校名称"><el-input v-model="item.school" placeholder="请输入学校名称" /></field><date-range v-model="item.dates" /></template>
    </repeat-section>
    <repeat-section title="家庭情况" :items="family" copy @add="family.push(newFamily())" @copy="family.splice($event+1,0,Object.assign({},family[$event]))" @remove="family.splice($event,1)">
      <el-alert slot="notice" title="请完整登记家庭成员，并登记1位紧急联系人。若招商局集团内有近亲属，则必须添加此亲属信息。" type="warning" show-icon :closable="false" />
      <template slot-scope="{ item }"><field label="关系类型"><select-box v-model="item.relation" /></field><field label="姓名"><el-input v-model="item.name" placeholder="请输入" /></field><field label="在集团任职"><el-radio-group v-model="item.internal"><el-radio label="是" /><el-radio label="否" /></el-radio-group></field><field label="工作单位"><el-input v-model="item.company" placeholder="请输入关键字搜索" /></field><field label="职位 / 职务"><el-input v-model="item.job" placeholder="请输入" /></field><field label="联系电话"><el-input v-model="item.phone" placeholder="请输入" /></field></template>
    </repeat-section>
    <section><h2>技能水平</h2><div class="grid"><field label="最高英语水平"><select-box v-model="form.english" /></field><field label="分数"><el-input v-model="form.score" placeholder="请输入" /></field><field label="计算机水平（可选）"><el-input v-model="form.computer" placeholder="请输入" /></field><field label="其他（可选）" class="span3"><el-input v-model="form.skills" placeholder="请输入爱好、特长或特别技能" /></field></div></section>
    <repeat-section title="实践经历" :items="practice" @add="practice.push(newPractice())" @remove="practice.splice($event,1)"><template slot-scope="{ item }"><field label="公司或组织"><el-input v-model="item.company" placeholder="请输入" /></field><field label="所在城市"><el-input v-model="item.city" placeholder="请输入" /></field><field label="职位或职责"><el-input v-model="item.job" placeholder="请输入" /></field><date-range v-model="item.dates" /><field label="单位联系人"><el-input v-model="item.contact" placeholder="请输入" /></field><field label="单位联系电话"><el-input v-model="item.phone" placeholder="请输入" /></field><field label="正式工作"><el-radio-group v-model="item.official"><el-radio label="是" /><el-radio label="否" /></el-radio-group></field><field label="内容与收获" class="span3"><el-input v-model="item.detail" placeholder="请输入" /></field></template></repeat-section>
    <repeat-section title="个人荣誉" :items="honors" @add="honors.push(newHonor())" @remove="honors.splice($event,1)"><template slot-scope="{ item }"><field label="荣誉类型"><select-box v-model="item.type" /></field><field label="奖项名称"><el-input v-model="item.name" placeholder="请输入" /></field><field label="获奖级别"><select-box v-model="item.level" /></field><field label="获奖时间"><el-date-picker v-model="item.date" placeholder="请选择时间" /></field></template></repeat-section>
    <repeat-section title="社团活动" :items="clubs" @add="clubs.push(newClub())" @remove="clubs.splice($event,1)"><template slot-scope="{ item }"><field label="社团名称"><el-input v-model="item.name" placeholder="请输入" /></field><field label="职务名称"><el-input v-model="item.job" placeholder="请输入" /></field><date-range v-model="item.dates" /><field label="活动描述" class="span3"><el-input v-model="item.detail" placeholder="可列举参加过的大型活动" /></field></template></repeat-section>
    <div class="promise"><el-checkbox v-model="form.promise">本人承诺未有涉黑涉恶背景，在本人过往的学习、工作及社会活动中，未曾有任何违法违规行为，亦未受到过任何纪律处分或行政处罚，并对所有应聘材料的真实性负全部责任。</el-checkbox></div>
    <div class="submit"><el-button type="primary" @click="$message.success('简历已保存')">保存简历</el-button></div>
  </div>
</template>
<script>
const Field={props:['label'],template:'<div class="field"><label>{{label}}</label><slot /></div>'}
const SelectBox={props:['value'],template:'<el-select :value="value" placeholder="请选择" @input="$emit(\'input\',$event)"><el-option label="请选择" value="请选择" /><el-option label="其他" value="其他" /></el-select>'}
const DateRange={props:['value'],template:'<div class="field"><label>时间</label><div class="dates"><el-date-picker :value="value&&value[0]" placeholder="请选择时间" @input="set(0,$event)" /><i>—</i><el-date-picker :value="value&&value[1]" placeholder="请选择时间" @input="set(1,$event)" /></div></div>',methods:{set(i,v){const a=(this.value||[]).slice();a[i]=v;this.$emit('input',a)}}}
const PhotoPicker={props:['value','label'],template:'<div class="photo"><label>{{label}}</label><div class="box" @click="$refs.file.click()"><img v-if="value" :src="value"><i v-else class="el-icon-plus" /><small v-if="!value">不超过500KB</small></div><input ref="file" hidden type="file" accept="image/*" @change="pick"></div>',methods:{pick(e){const f=e.target.files[0];if(f)this.$emit('input',URL.createObjectURL(f));e.target.value=''}}}
const RepeatSection={props:['title','items','copy'],template:'<section><h2>{{title}}</h2><slot name="notice" /><div v-for="(item,i) in items" :key="i" class="entry"><div class="grid"><slot :item="item" :index="i" /></div><div class="entry-actions"><button v-if="copy" @click="$emit(\'copy\',i)">▣ 复制</button><button @click="$emit(\'remove\',i)">♧ 删除</button></div></div><button class="add-row" @click="$emit(\'add\')">＋ 添加</button></section>'}
export default {
  name:'ResumeForm',components:{Field,SelectBox,DateRange,PhotoPicker,RepeatSection},
  data(){return{form:{phone:'18536525983',promise:true},education:[this.newEducation()],family:[this.newFamily(),this.newFamily()],practice:[this.newPractice()],honors:[this.newHonor()],clubs:[this.newClub()]}},
  methods:{newEducation(){return{degree:'高中',school:'',dates:[]}},newFamily(){return{relation:'',name:'',internal:'',company:'',job:'',phone:''}},newPractice(){return{company:'',city:'',job:'',dates:[],contact:'',phone:'',official:'',detail:''}},newHonor(){return{type:'',name:'',level:'',date:''}},newClub(){return{name:'',job:'',dates:[],detail:''}}}
}
</script>
<style scoped>
.resume-page{min-height:100vh;padding:14px;background:#f3f5f7;color:#30384a;font-size:16px}.resume-page section{margin-bottom:22px;padding:32px 42px;background:#fff;border-radius:6px}.resume-page h2{margin:0 0 28px;color:#111;font-size:22px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 46px;margin-top:28px}.field label,.photo>label{display:block;margin-bottom:12px}.field .el-select,.field .el-date-editor{width:100%}.span2{grid-column:span 2}.span3{grid-column:span 3}.photos{display:flex;gap:72px;margin:26px 0 42px}.photo .box{width:120px;height:120px;background:#f0f2f6;border:1px dashed #d5dae3;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#6e7789}.photo .box i{font-size:25px}.photo .box small{margin-top:24px;font-size:13px}.photo img{width:100%;height:100%;object-fit:cover}.dates{display:flex;align-items:center;gap:10px}.dates .el-date-editor{min-width:0}.entry{padding-bottom:24px;border-bottom:1px solid #e5e7eb}.entry-actions{margin-top:24px}.entry-actions button,.add-row{border:0;background:none;font-size:16px;cursor:pointer}.add-row{margin-top:24px;color:#e31837}.promise{padding:0 38px 28px;line-height:1.8}.submit{text-align:center;padding:0 0 36px}.submit .el-button{min-width:160px}.el-alert{margin-bottom:20px}
@media(max-width:900px){.resume-page section{padding:24px 18px}.grid{grid-template-columns:1fr;gap:20px}.span2,.span3{grid-column:auto}.photos{gap:28px}.dates{flex-wrap:wrap}}
</style>
